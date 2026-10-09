"""Outgoing email over SMTP (Python's built-in smtplib: no extra package).

Configured from SMTP_* in .env. Sending is blocking, so callers run it in a thread (asyncio.to_thread).
A Gmail account needs an "app password" (Google Account > Security > 2-Step Verification > App passwords).
"""
import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from html import escape

from app.core.config import settings

log = logging.getLogger(__name__)


def configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


@dataclass
class Mail:
    to: str
    name: str
    subject: str
    body: str
    # Ready-made versions (for emails with their own layout, like the activation code). Otherwise built from body.
    text: str | None = None
    html: str | None = None


def _first(name: str | None) -> str:
    return (name or "").strip().split(" ")[0] or "there"


def _build(m: Mail) -> EmailMessage:
    first = _first(m.name)
    text = f"Hi {first},\n\n{m.body.strip()}\n\n-- \nHome Proofolio. You're getting this because you have an account with us."
    paras = "".join(f'<p style="margin:0 0 14px">{escape(p).replace(chr(10), "<br>")}</p>' for p in m.body.strip().split("\n\n"))
    html = (
        '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1d1d1f;max-width:560px">'
        f'<p style="margin:0 0 14px">Hi {escape(first)},</p>{paras}'
        '<hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0 12px">'
        '<p style="margin:0;font-size:12px;color:#6b7280">Home Proofolio. You\'re getting this because you have an account with us.</p></div>'
    )
    msg = EmailMessage()
    msg["Subject"] = m.subject.strip() or "A message from Home Proofolio"
    msg["From"] = formataddr((settings.smtp_from_name, settings.smtp_user))
    msg["To"] = m.to
    msg["Message-ID"] = make_msgid(domain=settings.smtp_user.split("@")[-1] or None)
    msg.set_content(m.text or text)
    msg.add_alternative(m.html or html, subtype="html")
    return msg

# What each kind of code says in its email: (heading, what it is for). Anything else uses the activation wording.
_CODE_COPY: dict[str, tuple[str, str]] = {
    "activation": (
        "Hi {first}, welcome aboard.",
        "Here is your activation code. It switches on your account so you can publish your work and share your profile.",
    ),
    "login": (
        "Hi {first}, here is your sign-in code.",
        "Use this code to finish signing in to Home Proofolio. If you didn't try to sign in, change your password straight away.",
    ),
    "password_change": (
        "Hi {first}, confirm your password change.",
        "Use this code to confirm that you want to change your password. If you didn't ask for this, ignore this email: your password stays as it is.",
    ),
    "phone_verification": (
        "Hi {first}, let's verify your phone.",
        "Use this code to confirm your phone number on Home Proofolio.",
    ),
    "admin_test": (
        "Hi {first}, this is a test code.",
        "The Home Proofolio team sent you this code. You can safely ignore it.",
    ),
}
_CODE_COPY["registration"] = _CODE_COPY["activation"]


def code_mail(to: str, name: str | None, code: str, minutes: int, purpose: str = "activation") -> Mail:
    """A verification-code email: the code is the first thing the reader sees, then what it is for and a safety note."""
    first = _first(name)
    heading, intro = _CODE_COPY.get(purpose, _CODE_COPY["activation"])
    heading, intro = heading.format(first=first), intro
    spaced = f"{code[:3]} {code[3:]}" if len(code) == 6 else code
    subject = f"{spaced} is your Home Proofolio code"
    text = (
        f"{heading}\n\n"
        f"{intro}\n\n"
        f"    {spaced}\n\n"
        f"Enter it in the app within {minutes} minutes.\n\n"
        "Never share this code with anyone: Home Proofolio will never ask you for it. "
        "Didn't ask for it? You can ignore this email.\n\n"
        f"Msimbo wako wa uthibitisho ni {spaced}. Unaisha baada ya dakika {minutes}.\n\n"
        "-- \nHome Proofolio. Build. Prove. Connect."
    )
    html = (
        '<div style="background:#f5f5f7;padding:28px 12px;font-family:Segoe UI,Arial,sans-serif">'
        '<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">'
        '<div style="background:#1d1d1f;padding:20px 28px"><span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:.14em">HOME PROOFOLIO</span></div>'
        '<div style="padding:28px">'
        f'<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1d1d1f">{escape(heading)}</p>'
        f'<p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#4b5563">{escape(intro)}</p>'
        '<div style="text-align:center;margin:0 0 20px"><div style="display:inline-block;background:#f5f5f7;border:1px solid #e5e7eb;border-radius:12px;padding:16px 26px">'
        f'<span style="font-family:Consolas,Menlo,monospace;font-size:34px;font-weight:700;letter-spacing:.28em;color:#1d1d1f">{escape(spaced)}</span></div></div>'
        f'<p style="margin:0 0 20px;text-align:center;font-size:14px;color:#4b5563">Enter it in the app within <strong>{minutes} minutes</strong>.</p>'
        '<p style="margin:0 0 6px;font-size:13px;line-height:1.55;color:#6b7280"><strong style="color:#1d1d1f">Keep it to yourself.</strong> '
        "Home Proofolio will never ask you for this code.</p>"
        '<p style="margin:0;font-size:13px;line-height:1.55;color:#6b7280">'
        "Didn't ask for it? You can ignore this email.</p>"
        '<p style="margin:20px 0 0;padding-top:16px;border-top:1px solid #eee;font-size:13px;color:#9ca3af">'
        f"Msimbo wako wa uthibitisho ni <strong>{escape(spaced)}</strong>. Unaisha baada ya dakika {minutes}.</p>"
        "</div></div>"
        '<p style="max-width:480px;margin:14px auto 0;text-align:center;font-size:12px;color:#9ca3af">Home Proofolio &middot; Build. Prove. Connect.</p></div>'
    )
    return Mail(to=to, name=name or "", subject=subject, body="", text=text, html=html)


def _connect() -> smtplib.SMTP:
    ctx = ssl.create_default_context()
    if settings.smtp_ca_file:
        ctx.load_verify_locations(cafile=settings.smtp_ca_file)
    if settings.smtp_port == 465:
        smtp: smtplib.SMTP = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=25, context=ctx)
    else:
        smtp = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=25)
        smtp.starttls(context=ctx)
    # Google shows app passwords in groups of four with spaces; they are not part of the password.
    smtp.login(settings.smtp_user, settings.smtp_password.replace(" ", ""))
    return smtp


def send_many(mails: list[Mail]) -> list[str | None]:
    """Send each mail over one connection. Returns, per mail, None if sent or a short reason if not."""
    results: list[str | None] = []
    smtp: smtplib.SMTP | None = None
    try:
        for i, m in enumerate(mails):
            try:
                if smtp is None:
                    smtp = _connect()
                smtp.send_message(_build(m))
                results.append(None)
            except smtplib.SMTPRecipientsRefused:
                results.append("address refused")
            except smtplib.SMTPAuthenticationError:
                log.error("SMTP login refused: check SMTP_USER / SMTP_PASSWORD (use an app password)")
                # Don't retry the login for everyone else (repeated bad logins get an account locked).
                results.extend(["email login refused"] * (len(mails) - i))
                smtp = None
                break
            except (smtplib.SMTPException, OSError) as e:
                log.warning("SMTP send failed for one recipient: %s", e)
                results.append("couldn't send")
                try:
                    if smtp:
                        smtp.close()
                finally:
                    smtp = None  # reconnect for the next one
    finally:
        if smtp:
            try:
                smtp.quit()
            except Exception:
                pass
    return results
