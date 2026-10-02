defmodule RealtimeChat.Messages do
  @moduledoc "Chat history in Postgres. A message is acked to its sender only after it is stored here."
  require Logger

  @db RealtimeChat.DB
  @cols "client_id, id, topic, author_id::text, author_name, author_username, body, reply_to, inserted_at, recipient_id::text, read_at"
  @max_seq 9_223_372_036_854_775_807

  # (author_id, client_id) is unique, so a client resending after a lost ack gets the same row back.
  @insert """
  INSERT INTO chat_messages (client_id, topic, author_id, author_name, author_username, body, reply_to, recipient_id)
  VALUES ($1, $2, $3::text::uuid, $4, $5, $6, $7, $8::text::uuid)
  ON CONFLICT (author_id, client_id) DO UPDATE SET client_id = EXCLUDED.client_id
  RETURNING #{@cols}
  """

  def insert(topic, author, client_id, text, reply_to, recipient_id) do
    params = [client_id, topic, author.user_id, author.name, author.username, text, reply_to, recipient_id]

    case Postgrex.query(@db, @insert, params) do
      {:ok, %{rows: [row]}} ->
        case to_map(row) do
          %{topic: ^topic} = msg -> {:ok, msg}
          _ -> {:error, "message id already used"}
        end

      {:error, err} ->
        Logger.error("chat insert failed: #{Exception.message(err)}")
        {:error, "not saved, retry"}
    end
  end

  @doc "Up to `limit` messages with after < seq < before, oldest first, and whether older ones exist."
  def page(topic, limit, opts \\ []) do
    rows =
      query(
        "SELECT * FROM (SELECT #{@cols} FROM chat_messages WHERE topic = $1 AND id > $2 AND id < $3 ORDER BY id DESC LIMIT $4) t ORDER BY id",
        [topic, opts[:after] || 0, opts[:before] || @max_seq, limit + 1]
      )

    if length(rows) > limit, do: {tl(rows), true}, else: {rows, false}
  end

  @doc "Reader has seen everything sent to them in `topic` up to seq. Returns how many became read."
  def mark_read(topic, reader_id, up_to) do
    case Postgrex.query(
           @db,
           "UPDATE chat_messages SET read_at = now() WHERE topic = $1 AND recipient_id = $2::text::uuid AND read_at IS NULL AND id <= $3",
           [topic, reader_id, up_to]
         ) do
      {:ok, %{num_rows: n}} -> n
      {:error, err} -> raise err
    end
  end

  @doc "%{topic => unread count} of DMs sent to this user."
  def unread_counts(user_id) do
    %{rows: rows} =
      Postgrex.query!(
        @db,
        "SELECT topic, count(*) FROM chat_messages WHERE recipient_id = $1::text::uuid AND read_at IS NULL GROUP BY topic",
        [user_id]
      )

    Map.new(rows, fn [topic, n] -> {topic, n} end)
  end

  # One bell notification per conversation ("X sent you 3 messages"), refreshed by each new
  # message while unread; cleared by clear_notification/2 when the chat is read. The partial
  # unique index uq_notifications_unread_message makes concurrent sends update one row, and
  # HAVING skips it when the chat was already read (receipt beat this background write).
  @notify """
  INSERT INTO notifications (id, user_id, kind, title, body, link)
  SELECT gen_random_uuid(), $1::text::uuid, 'message',
         CASE WHEN count(*) > 1 THEN $4 || ' sent you ' || count(*) || ' messages' ELSE $4 || ' sent you a message' END,
         $5, $2
  FROM chat_messages WHERE topic = $3 AND recipient_id = $1::text::uuid AND read_at IS NULL
  HAVING count(*) > 0
  ON CONFLICT (user_id, link) WHERE kind = 'message' AND read_at IS NULL
  DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, created_at = now()
  """

  def notify(recipient_id, from_name, topic, text) do
    Postgrex.query(@db, @notify, [recipient_id, chat_link(topic), topic, from_name, String.slice(text, 0, 140)])
  end

  def clear_notification(user_id, topic) do
    Postgrex.query(
      @db,
      "UPDATE notifications SET read_at = now() WHERE user_id = $1::text::uuid AND kind = 'message' AND link = $2 AND read_at IS NULL",
      [user_id, chat_link(topic)]
    )
  end

  defp chat_link(topic), do: "/chat?c=" <> URI.encode_www_form(topic)

  # Admin analytics: counts and timings only, never who or what.
  # ponytail: full scans of chat_messages; add an index on inserted_at once it holds millions of rows.
  @stats """
  SELECT
    count(*),
    count(*) FILTER (WHERE inserted_at > now() - interval '1 hour'),
    count(*) FILTER (WHERE inserted_at > now() - interval '24 hours'),
    count(*) FILTER (WHERE inserted_at > now() - interval '24 hours' AND topic LIKE 'direct:%'),
    count(DISTINCT author_id) FILTER (WHERE inserted_at > now() - interval '24 hours'),
    count(DISTINCT topic) FILTER (WHERE inserted_at > now() - interval '24 hours'),
    count(*) FILTER (WHERE recipient_id IS NOT NULL AND read_at IS NULL),
    percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM read_at - inserted_at))
      FILTER (WHERE read_at > inserted_at AND inserted_at > now() - interval '7 days') -- = excludes rows the migration backfilled as read
  FROM chat_messages
  """

  def stats do
    %{rows: [[total, hour, day, direct_day, senders, convos, unread, read_secs]]} = Postgrex.query!(@db, @stats, [])

    %{rows: hourly} =
      Postgrex.query!(
        @db,
        """
        SELECT extract(epoch FROM date_trunc('hour', inserted_at))::bigint,
               count(*) FILTER (WHERE topic LIKE 'direct:%'), count(*) FILTER (WHERE topic NOT LIKE 'direct:%')
        FROM chat_messages WHERE inserted_at > now() - interval '24 hours' GROUP BY 1 ORDER BY 1
        """,
        []
      )

    %{
      total: total,
      last_hour: hour,
      last_day: day,
      direct_day: direct_day,
      senders_day: senders,
      conversations_day: convos,
      unread: unread,
      median_read_secs: read_secs,
      hourly: Enum.map(hourly, fn [h, direct, room] -> %{hour: h, direct: direct, room: room} end)
    }
  end

  defp query(sql, params) do
    case Postgrex.query(@db, sql, params) do
      {:ok, %{rows: rows}} -> Enum.map(rows, &to_map/1)
      {:error, err} -> raise err
    end
  end

  defp to_map([client_id, seq, topic, author_id, name, username, body, reply_to, at, recipient_id, read_at]) do
    %{
      id: Integer.to_string(seq),
      seq: seq,
      client_id: client_id,
      topic: topic,
      author_id: author_id,
      author_name: name,
      author_username: username,
      recipient_id: recipient_id,
      text: body,
      reply_to: reply_to,
      timestamp: DateTime.to_iso8601(at),
      read_at: read_at && DateTime.to_iso8601(read_at)
    }
  end
end
