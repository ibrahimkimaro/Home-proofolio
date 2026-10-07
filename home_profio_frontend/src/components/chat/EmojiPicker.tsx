"use client";

import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

/**
 * An emoji picker with categories, search and "recently used". No library and no network: the emoji and
 * their search words are listed here. Used in the message box and for reactions.
 */

type Item = [emoji: string, words: string];
interface Category {
  id: string;
  label: string;
  icon: string;
  items: Item[];
}

const CATEGORIES: Category[] = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "😀",
    items: [
      ["😀", "grinning happy"], ["😃", "smile happy"], ["😄", "smile joy"], ["😁", "beaming grin"], ["😆", "laugh"], ["😅", "sweat smile relief"],
      ["😂", "joy tears laugh lol"], ["🤣", "rofl rolling laugh"], ["🙂", "slight smile"], ["🙃", "upside down"], ["😉", "wink"], ["😊", "blush happy"],
      ["😇", "angel innocent"], ["🥰", "love hearts"], ["😍", "heart eyes love"], ["🤩", "star struck wow"], ["😘", "kiss"], ["😋", "yum tasty"],
      ["😛", "tongue"], ["😜", "wink tongue silly"], ["🤪", "zany crazy"], ["🤗", "hug"], ["🤭", "oops giggle"], ["🤔", "thinking hmm"],
      ["🤨", "raised eyebrow doubt"], ["😐", "neutral"], ["😑", "expressionless"], ["😶", "no mouth silent"], ["😏", "smirk"], ["😒", "unamused"],
      ["🙄", "eye roll"], ["😬", "grimace awkward"], ["😌", "relieved calm"], ["😔", "pensive sad"], ["😪", "sleepy"], ["😴", "sleeping zzz"],
      ["😷", "mask sick"], ["🤒", "fever ill"], ["🤕", "hurt bandage"], ["🤢", "nauseated"], ["🤮", "vomit"], ["🥵", "hot"],
      ["🥶", "cold freezing"], ["🥴", "woozy"], ["😵", "dizzy"], ["🤯", "mind blown"], ["🤠", "cowboy"], ["🥳", "party celebrate"],
      ["😎", "cool sunglasses"], ["🤓", "nerd"], ["🧐", "monocle curious"], ["😕", "confused"], ["😟", "worried"], ["🙁", "frown"],
      ["😮", "surprised wow"], ["😲", "astonished"], ["😳", "flushed embarrassed"], ["🥺", "pleading please"], ["😢", "cry sad"], ["😭", "sob crying"],
      ["😱", "scream fear shocked"], ["😖", "confounded"], ["😞", "disappointed"], ["😓", "sweat"], ["😩", "weary"], ["😫", "tired"],
      ["🥱", "yawn bored"], ["😤", "triumph huff"], ["😡", "angry mad"], ["😠", "angry"], ["🤬", "swearing cursing"], ["😈", "devil"],
      ["💀", "skull dead"], ["💩", "poop"], ["🤡", "clown"], ["👻", "ghost"], ["👽", "alien"], ["🤖", "robot"],
    ],
  },
  {
    id: "people",
    label: "People",
    icon: "👍",
    items: [
      ["👍", "thumbs up like yes good"], ["👎", "thumbs down dislike no"], ["👌", "ok perfect"], ["✌️", "peace victory"], ["🤞", "fingers crossed luck"], ["🤟", "love you"],
      ["🤘", "rock on"], ["🤙", "call me"], ["👈", "point left"], ["👉", "point right"], ["👆", "point up"], ["👇", "point down"],
      ["☝️", "one index up"], ["✋", "hand stop high five"], ["🖐️", "hand fingers"], ["👋", "wave hello bye"], ["🤚", "raised back hand"], ["🖖", "vulcan spock"],
      ["👏", "clap applause bravo"], ["🙌", "raise hands celebrate praise"], ["👐", "open hands"], ["🤲", "palms up"], ["🤝", "handshake deal agreement"], ["🙏", "pray thanks please"],
      ["✍️", "writing"], ["💪", "muscle strong"], ["🧠", "brain smart"], ["👀", "eyes look"], ["👂", "ear listen"], ["👄", "mouth lips"],
      ["🫶", "heart hands love"], ["🫡", "salute respect"], ["🤦", "facepalm"], ["🤷", "shrug"], ["🙋", "raise hand question"], ["🙆", "ok gesture"],
      ["🙅", "no gesture"], ["💁", "information desk"], ["🧑‍💻", "technologist developer coder"], ["🧑‍🏫", "teacher"], ["🧑‍⚕️", "doctor nurse health"], ["🧑‍🔧", "mechanic"],
      ["👷", "builder construction"], ["🧑‍🌾", "farmer"], ["🧑‍🍳", "cook chef"], ["🧑‍🎨", "artist"], ["🧑‍🚀", "astronaut"], ["👨‍👩‍👧", "family"],
      ["🧑‍🤝‍🧑", "friends people holding hands"], ["🏃", "run running"], ["🧘", "yoga calm"], ["🕺", "dance"], ["💃", "dance"], ["🚶", "walk"],
    ],
  },
  {
    id: "hearts",
    label: "Hearts & symbols",
    icon: "❤️",
    items: [
      ["❤️", "red heart love"], ["🧡", "orange heart"], ["💛", "yellow heart"], ["💚", "green heart"], ["💙", "blue heart"], ["💜", "purple heart"],
      ["🖤", "black heart"], ["🤍", "white heart"], ["🤎", "brown heart"], ["💔", "broken heart"], ["❣️", "heart exclamation"], ["💕", "two hearts"],
      ["💞", "revolving hearts"], ["💓", "beating heart"], ["💗", "growing heart"], ["💖", "sparkling heart"], ["💘", "heart arrow cupid"], ["💝", "heart gift"],
      ["✨", "sparkles magic"], ["⭐", "star"], ["🌟", "glowing star"], ["💫", "dizzy star"], ["⚡", "lightning fast energy"], ["🔥", "fire hot lit"],
      ["💥", "boom collision"], ["💯", "hundred perfect"], ["✅", "check done yes"], ["❌", "cross no wrong"], ["❓", "question"], ["❗", "exclamation important"],
      ["‼️", "double exclamation"], ["⚠️", "warning"], ["🚫", "prohibited no"], ["➕", "plus add"], ["➖", "minus"], ["✔️", "check mark"],
      ["☑️", "checked box"], ["🔔", "bell notification"], ["🔕", "bell off mute"], ["📌", "pin"], ["🔒", "lock secure"], ["🔓", "unlock"],
      ["🔑", "key"], ["💡", "idea bulb"], ["♻️", "recycle"], ["🏁", "finish flag race"], ["🚩", "red flag"], ["🎯", "target bullseye goal"],
    ],
  },
  {
    id: "celebrate",
    label: "Objects & celebration",
    icon: "🎉",
    items: [
      ["🎉", "party popper celebrate congratulations"], ["🎊", "confetti"], ["🎈", "balloon"], ["🎁", "gift present"], ["🏆", "trophy winner"], ["🥇", "gold medal first"],
      ["🥈", "silver medal"], ["🥉", "bronze medal"], ["🏅", "medal"], ["🎂", "birthday cake"], ["🍾", "champagne"], ["🥂", "cheers toast"],
      ["🎵", "music note"], ["🎶", "music notes"], ["🎤", "microphone"], ["🎧", "headphones"], ["🎮", "game controller"], ["📱", "phone mobile"],
      ["💻", "laptop computer"], ["🖥️", "desktop computer"], ["⌨️", "keyboard"], ["📷", "camera photo"], ["📹", "video camera"], ["🔋", "battery"],
      ["🔌", "plug"], ["💾", "save disk"], ["📁", "folder"], ["📂", "open folder"], ["📄", "document page"], ["📝", "memo note write"],
      ["📋", "clipboard"], ["📊", "chart bar"], ["📈", "chart up growth"], ["📉", "chart down"], ["📎", "paperclip attach"], ["🔗", "link"],
      ["✉️", "email envelope"], ["📧", "email"], ["📞", "telephone call"], ["📅", "calendar date"], ["⏰", "alarm clock"], ["⏳", "hourglass waiting"],
      ["🛠️", "tools"], ["🔧", "wrench"], ["🔨", "hammer"], ["⚙️", "gear settings"], ["🧪", "test tube experiment"], ["🔬", "microscope science"],
      ["📚", "books study"], ["🎓", "graduation cap"], ["🏢", "office building"], ["🏠", "home house"], ["🏥", "hospital"], ["🏫", "school"],
      ["💰", "money bag"], ["💵", "dollar cash"], ["💳", "credit card"], ["🛒", "shopping cart"],
    ],
  },
  {
    id: "nature",
    label: "Animals & nature",
    icon: "🦁",
    items: [
      ["🐶", "dog"], ["🐱", "cat"], ["🐭", "mouse"], ["🐹", "hamster"], ["🐰", "rabbit"], ["🦊", "fox"],
      ["🐻", "bear"], ["🐼", "panda"], ["🐨", "koala"], ["🐯", "tiger"], ["🦁", "lion"], ["🐮", "cow"],
      ["🐷", "pig"], ["🐸", "frog"], ["🐵", "monkey"], ["🙈", "see no evil monkey"], ["🙉", "hear no evil"], ["🙊", "speak no evil"],
      ["🐔", "chicken"], ["🐧", "penguin"], ["🐦", "bird"], ["🦅", "eagle"], ["🦉", "owl"], ["🐝", "bee"],
      ["🦋", "butterfly"], ["🐢", "turtle"], ["🐍", "snake"], ["🐘", "elephant"], ["🦒", "giraffe"], ["🦓", "zebra"],
      ["🦍", "gorilla"], ["🐊", "crocodile"], ["🐟", "fish"], ["🐬", "dolphin"], ["🐳", "whale"], ["🌳", "tree"],
      ["🌴", "palm tree"], ["🌵", "cactus"], ["🌸", "blossom flower"], ["🌹", "rose"], ["🌻", "sunflower"], ["🌍", "earth africa world"],
      ["🌙", "moon night"], ["☀️", "sun sunny"], ["⛅", "partly cloudy"], ["🌧️", "rain"], ["⛈️", "storm thunder"], ["🌈", "rainbow"],
      ["❄️", "snow"], ["🌊", "wave sea"],
    ],
  },
  {
    id: "food",
    label: "Food & drink",
    icon: "🍕",
    items: [
      ["🍎", "apple"], ["🍌", "banana"], ["🍉", "watermelon"], ["🍇", "grapes"], ["🍓", "strawberry"], ["🥭", "mango"],
      ["🍍", "pineapple"], ["🥥", "coconut"], ["🥑", "avocado"], ["🍅", "tomato"], ["🥕", "carrot"], ["🌽", "corn maize"],
      ["🍞", "bread"], ["🧀", "cheese"], ["🍳", "egg cooking"], ["🥞", "pancakes"], ["🍔", "burger"], ["🍟", "fries chips"],
      ["🍕", "pizza"], ["🌮", "taco"], ["🍗", "chicken leg"], ["🍖", "meat"], ["🍚", "rice"], ["🍜", "noodles"],
      ["🍝", "pasta"], ["🍲", "stew pot"], ["🍰", "cake slice"], ["🍫", "chocolate"], ["🍬", "candy sweet"], ["🍪", "cookie"],
      ["🍩", "donut"], ["🍦", "ice cream"], ["☕", "coffee"], ["🍵", "tea"], ["🥤", "soda drink cup"], ["🍺", "beer"],
      ["🍷", "wine"], ["🧃", "juice"], ["💧", "water drop"],
    ],
  },
  {
    id: "activities",
    label: "Travel & activities",
    icon: "⚽",
    items: [
      ["⚽", "soccer football"], ["🏀", "basketball"], ["🏈", "american football"], ["⚾", "baseball"], ["🎾", "tennis"], ["🏐", "volleyball"],
      ["🏉", "rugby"], ["🥊", "boxing"], ["🏊", "swim swimming"], ["🚴", "cycling bike"], ["♟️", "chess"], ["🎲", "dice game"],
      ["🧩", "puzzle"], ["🎨", "art palette paint"], ["🚗", "car"], ["🚕", "taxi"], ["🚌", "bus"], ["🏍️", "motorcycle"],
      ["🚲", "bicycle"], ["🚆", "train"], ["✈️", "airplane flight"], ["🚀", "rocket launch"], ["🛵", "scooter"], ["🚢", "ship"],
      ["⛵", "sailboat"], ["🗺️", "map"], ["🏖️", "beach"], ["🏔️", "mountain"], ["🌋", "volcano"], ["🏕️", "camping"],
    ],
  },
  {
    id: "flags",
    label: "Flags",
    icon: "🏁",
    items: [
      ["🇹🇿", "tanzania"], ["🇰🇪", "kenya"], ["🇺🇬", "uganda"], ["🇷🇼", "rwanda"], ["🇧🇮", "burundi"], ["🇨🇩", "congo drc"],
      ["🇿🇲", "zambia"], ["🇲🇼", "malawi"], ["🇲🇿", "mozambique"], ["🇿🇦", "south africa"], ["🇳🇬", "nigeria"], ["🇬🇭", "ghana"],
      ["🇪🇹", "ethiopia"], ["🇪🇬", "egypt"], ["🇺🇸", "usa united states america"], ["🇬🇧", "uk united kingdom britain"], ["🇨🇦", "canada"], ["🇫🇷", "france"],
      ["🇩🇪", "germany"], ["🇮🇳", "india"], ["🇨🇳", "china"], ["🇯🇵", "japan"], ["🇧🇷", "brazil"], ["🇦🇪", "uae emirates dubai"],
      ["🇸🇦", "saudi arabia"], ["🏳️‍🌈", "pride rainbow flag"], ["🏴", "black flag"], ["🏁", "chequered flag"],
    ],
  },
];

const RECENT_KEY = "proofolio-recent-emojis";
const RECENT_MAX = 24;

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((e) => typeof e === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function remember(emoji: string) {
  try {
    const next = [emoji, ...readRecent().filter((e) => e !== emoji)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

/** `onPick` gets the chosen emoji. `compact` is the smaller version used for reactions. */
export function EmojiPicker({ onPick, compact = false, className = "" }: { onPick: (emoji: string) => void; compact?: boolean; className?: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("smileys");
  // Read lazily and only once, on the client (this component only mounts after a click).
  const [recent, setRecent] = useState<string[]>(() => (typeof window === "undefined" ? [] : readRecent()));
  const gridRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const shown = useMemo<Item[]>(() => {
    if (q) return CATEGORIES.flatMap((c) => c.items).filter(([e, words]) => words.includes(q) || e === q);
    if (category === "recent") return recent.map((e) => [e, ""] as Item);
    return CATEGORIES.find((c) => c.id === category)?.items ?? [];
  }, [q, category, recent]);

  function pick(emoji: string) {
    remember(emoji);
    setRecent(readRecent());
    onPick(emoji);
  }

  const tabs = [...(recent.length ? [{ id: "recent", label: "Recently used", icon: "🕘" }] : []), ...CATEGORIES.map(({ id, label, icon }) => ({ id, label, icon }))];

  return (
    <div className={`overflow-hidden rounded-2xl border border-hairline bg-paper shadow-xl ${compact ? "w-[17.5rem]" : "w-full"} ${className}`}>
      <div className="relative border-b border-hairline/70 p-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate/60" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji, e.g. heart, fire, tanzania"
          aria-label="Search emoji"
          className="h-9 w-full rounded-lg bg-paper-dim/60 pl-8 pr-3 text-base text-ink outline-none placeholder:text-slate/50 sm:text-xs"
        />
      </div>

      {!q && (
        <div role="tablist" aria-label="Emoji categories" className="flex gap-0.5 overflow-x-auto border-b border-hairline/70 px-1.5 py-1 scrollbar-none">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={category === t.id}
              title={t.label}
              aria-label={t.label}
              onClick={() => {
                setCategory(t.id);
                gridRef.current?.scrollTo({ top: 0 });
              }}
              className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-base transition-colors ${
                category === t.id ? "bg-paper-dim" : "opacity-60 hover:bg-paper-dim/60 hover:opacity-100"
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>
      )}

      <div ref={gridRef} className={`overflow-y-auto p-2 ${compact ? "h-48" : "h-56"}`}>
        {shown.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate">{q ? `No emoji match "${query.trim()}".` : "Nothing here yet."}</p>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {shown.map(([e, words]) => (
              <button
                key={e}
                type="button"
                title={words.split(" ")[0] || undefined}
                onClick={() => pick(e)}
                className="flex h-8 w-full cursor-pointer items-center justify-center rounded-lg text-xl transition-transform hover:scale-125 hover:bg-paper-dim"
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
