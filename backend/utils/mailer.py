import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from specific path if needed, or default
load_dotenv()

def send_email_report(subject, body, recipients=None):
    """
    Sends an email using SMTP credentials from .env
    """
    sender_email = os.getenv("EMAIL_USER")
    sender_password = os.getenv("EMAIL_PASS")
    
    if not sender_email or not sender_password:
        print("⚠️ Email credentials (EMAIL_USER, EMAIL_PASS) not found in .env. Skipping email.")
        return False

    # Default recipient to sender if not specified
    if recipients is None:
        recipients = [sender_email]
    elif isinstance(recipients, str):
        recipients = [recipients]

    try:
        msg = MIMEMultipart()
        msg['From'] = f"IPO Radar Bot <{sender_email}>"
        msg['To'] = ", ".join(recipients)
        msg['Subject'] = f"{subject} - {datetime.now().strftime('%Y-%m-%d %H:%M')}"

        msg.attach(MIMEText(body, 'html')) # Sending as HTML for better formatting

        # Connect to Gmail SMTP (or change host for other providers)
        # Using Gmail default: smtp.gmail.com port 587
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        
        text = msg.as_string()
        server.sendmail(sender_email, recipients, text)
        server.quit()
        
        print(f"📧 Email report sent to {recipients}")
        return True

    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False

# Test block
if __name__ == "__main__":
    send_email_report("Test Subject", "<h1>Test Body</h1><p>This is a test email from IPO Radar.</p>")
