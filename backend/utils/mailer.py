import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Try to import SendGrid, fall back to SMTP if not available
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, Email, To, Content
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

def send_email_report(subject, body, recipients=None):
    """
    Sends an email using SendGrid (preferred) or Gmail SMTP (fallback)
    """
    sender_email = os.getenv("EMAIL_USER")
    sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
    
    # Default recipient to sender if not specified
    if recipients is None:
        recipients = [sender_email]
    elif isinstance(recipients, str):
        recipients = [recipients]

    # Try SendGrid first (more reliable)
    if SENDGRID_AVAILABLE and sendgrid_api_key:
        try:
            sg = SendGridAPIClient(sendgrid_api_key)
            
            # SendGrid requires sending to each recipient separately for personalization
            for recipient in recipients:
                message = Mail(
                    from_email=sender_email,
                    to_emails=recipient,
                    subject=f"{subject} - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
                    html_content=body
                )
                
                response = sg.send(message)
                if response.status_code == 202:
                    print(f"📧 Email sent to {recipient} via SendGrid")
                else:
                    print(f"⚠️ SendGrid returned status {response.status_code} for {recipient}")
            
            return True
            
        except Exception as e:
            print(f"❌ SendGrid failed: {e}")
            print("⚠️ Falling back to Gmail SMTP...")
    
    # Fallback to Gmail SMTP
    sender_password = os.getenv("EMAIL_PASS")
    
    if not sender_email or not sender_password:
        print("⚠️ Email credentials not found. Skipping email.")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = f"IPO Radar Bot <{sender_email}>"
        msg['To'] = ", ".join(recipients)
        msg['Subject'] = f"{subject} - {datetime.now().strftime('%Y-%m-%d %H:%M')}"

        msg.attach(MIMEText(body, 'html'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password)
        
        text = msg.as_string()
        server.sendmail(sender_email, recipients, text)
        server.quit()
        
        print(f"📧 Email sent to {recipients} via Gmail SMTP")
        return True

    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False

# Test block
if __name__ == "__main__":
    send_email_report("Test Subject", "<h1>Test Body</h1><p>This is a test email from IPO Radar.</p>")
