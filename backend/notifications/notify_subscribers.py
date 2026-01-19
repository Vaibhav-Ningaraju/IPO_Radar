import os
import time
import datetime
from dateutil import parser
from pymongo import MongoClient
from dotenv import load_dotenv
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.mailer import send_email_report

load_dotenv()

# --- Helpers ---

def parse_frequency(freq_str):
    """Returns timedelta for frequency string"""
    if not freq_str:
        return datetime.timedelta(days=1)
    
    if freq_str.endswith('day') or freq_str.endswith('days'):
        num = int(freq_str.replace('days', '').replace('day', ''))
        return datetime.timedelta(days=num)
    
    if freq_str.endswith('week') or freq_str.endswith('weeks'):
        num = int(freq_str.replace('weeks', '').replace('week', ''))
        return datetime.timedelta(weeks=num)
        
    if freq_str.endswith('month'):
        # Approximate
        return datetime.timedelta(days=30)
        
    return datetime.timedelta(days=1)

def should_notify(user):
    """Checks if enough time has passed since last notification based on frequency"""
    prefs = user.get('preferences', {})
    last_sent = prefs.get('lastNotificationSentAt')
    frequency = prefs.get('frequency', '1day')
    
    if not last_sent:
        return True # Never sent, so send now
        
    delta = parse_frequency(frequency)
    
    # Mongo returns datetime object for dates
    if isinstance(last_sent, str):
        try:
            last_sent = parser.parse(last_sent)
        except:
            return True # Parse error, safer to send
            
    # If using Timezone aware vs naive, convert to naive/UTC
    now = datetime.datetime.now(datetime.timezone.utc)
    
    # Ensure last_sent is timezone aware if now is
    if last_sent.tzinfo is None:
        last_sent = last_sent.replace(tzinfo=datetime.timezone.utc)
        
    if (now - last_sent) >= delta:
        return True
        
    return False

def get_market_sentiment(db):
    open_ipos = list(db.ipos.find({"status": "open"}))
    total_subscriptions = 0
    count = 0
    for ipo in open_ipos:
        sub = ipo.get('values', {}).get('overall subscription', '0')
        try:
            val = float(sub.split('x')[0].replace(',',''))
            total_subscriptions += val
            count += 1
        except:
            pass
    avg_sub = (total_subscriptions / count) if count > 0 else 0
    if avg_sub > 50: return "Euphoric 🚀🚀"
    if avg_sub > 10: return "Bullish 🚀"
    if avg_sub > 2: return "Neutral ⚖️"
    return "Bearish 📉"

def get_ipo_card_html(ipo):
    v = ipo.get('values', {})
    name = ipo['ipo_name']
    gmp = v.get('gmp', v.get('gmp(₹)', 'N/A'))
    sub = v.get('subscription', v.get('overall subscription', 'N/A'))
    price = v.get('price band') or v.get('issue price') or 'TBA'
    
    # Extract close date
    ipo_date_range = v.get('ipo date', '')
    close_date = 'TBA'
    if ipo_date_range and ' to ' in str(ipo_date_range):
        try:
            close_date = ipo_date_range.split(' to ')[1].strip()
        except:
            close_date = ipo_date_range
            
    detail_link = f"http://localhost:5173/ipo/{ipo['_id']}"
    
    gmp_color = 'green' if '₹' in str(gmp) and str(gmp) != 'N/A' else '#666'

    return f"""
    <div style="border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 16px; border-radius: 12px; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h3 style="margin-top: 0; margin-bottom: 12px; color: #111827; font-size: 18px;">{name}</h3>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
                <td style="padding: 4px 0; color: #6b7280;">Price Range</td>
                <td style="padding: 4px 0; font-weight: 600; color: #374151;">{price}</td>
            </tr>
            <tr>
                <td style="padding: 4px 0; color: #6b7280;">GMP</td>
                <td style="padding: 4px 0; font-weight: 600; color: {gmp_color};">{gmp}</td>
            </tr>
             <tr>
                <td style="padding: 4px 0; color: #6b7280;">Subscription</td>
                <td style="padding: 4px 0; font-weight: 600; color: #374151;">{sub}</td>
            </tr>
             <tr>
                <td style="padding: 4px 0; color: #6b7280;">Closes On</td>
                <td style="padding: 4px 0; font-weight: 600; color: #374151;">{close_date}</td>
            </tr>
        </table>
        <div style="margin-top: 12px;">
            <a href="{detail_link}" style="display: block; width: 100%; text-align: center; padding: 10px 0; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px;">
                View Details
            </a>
        </div>
    </div>
    """

def main():
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("❌ MONGO_URI not found.")
        return

    client = MongoClient(mongo_uri)
    db = client["ipo-radar"]
    users_collection = db["users"]
    ipos_collection = db["ipos"]

    # 1. Fetch Candidates
    subscribers = list(users_collection.find({
        # "preferences.notificationEmail": {"$exists": True, "$ne": ""}, # Not strict, fallback to email
        "preferences.emailEnabled": True
    }))

    if not subscribers:
        print("ℹ️ No enabled subscribers found.")
        return

    print(f"found {len(subscribers)} potential subscribers.")

    # 2. Pre-fetch Data
    open_ipos = list(ipos_collection.find({"status": "open"}))
    upcoming_ipos = list(ipos_collection.find({"status": "upcoming"}))
    sentiment = get_market_sentiment(db)

    count_sent = 0

    for user in subscribers:
        prefs = user.get('preferences', {})
        email = prefs.get('notificationEmail') or user.get('email')
        
        if not email: 
            continue

        # Frequency Check
        if not should_notify(user):
            print(f"Skipping {email} (Frequency limit)")
            continue

        # Build Content based on Choices
        content_parts = []
        has_content = False

        # Header
        html_body = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.5; color: #333;">
            <h2 style="margin-bottom: 8px;">IPO Radar Update</h2>
            <div style="background-color: #f3f4f6; padding: 8px 12px; border-radius: 6px; margin-bottom: 20px; font-size: 14px;">
                Market Sentiment: <strong style="color: #000;">{sentiment}</strong>
            </div>
        """

        # Section: New / Open IPOs
        if prefs.get('newIPOs', True) and open_ipos:
            section_html = "<h3 style='color: #16a34a; margin-top: 24px;'>🟢 Open Now</h3>"
            for ipo in open_ipos:
                section_html += get_ipo_card_html(ipo)
            
            html_body += section_html
            has_content = True

        # Section: Upcoming / Listing Date (Grouped for simplicity if listingDate requested)
        if (prefs.get('listingDate', False) or prefs.get('closingSoon', False)) and upcoming_ipos:
            # We can refine this to check dates, but for now showing upcoming is good value
            section_html = "<h3 style='color: #2563eb; margin-top: 24px;'>🔵 Upcoming & Listing Soon</h3>"
            shown_any = False
            for ipo in upcoming_ipos:
                # Todo: Add finer filters (e.g. check if listing date is set)
                section_html += get_ipo_card_html(ipo)
                shown_any = True
            
            if shown_any:
                html_body += section_html
                has_content = True

        # Footer
        html_body += """
            <hr style="margin-top: 30px; border: none; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280; text-align: center;">
                You are receiving this because you subscribed on IPO Radar. 
                <a href="http://localhost:5173" style="color: #2563eb;">Manage Preferences</a>
            </p>
        </div>
        """

        if has_content:
            print(f"📧 Sending update to {email}...")
            subject = f"IPO Radar: Daily Update ({datetime.datetime.now().strftime('%d %b')})"
            success = send_email_report(subject, html_body, [email])
            
            if success:
                count_sent += 1
                # Update last sent timestamp
                users_collection.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"preferences.lastNotificationSentAt": datetime.datetime.now(datetime.timezone.utc)}}
                )
        else:
            print(f"Skipping {email} (No relevant content match)")

    print(f"✅ Sent updates to {count_sent} subscribers.")

if __name__ == "__main__":
    main()
