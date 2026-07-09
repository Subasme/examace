import os
import requests
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
GOOGLE_SCRIPT_URL = os.getenv("GOOGLE_SCRIPT_URL")

# Templates dictionary for emails
EMAIL_TEMPLATES = {
    "welcome_onboarding": {
        "subject": "Welcome to KARNAN NEET UG Preparation!",
        "html": "<h3>Hello {display_name},</h3><p>Thank you for registering at KARNAN physics. We are excited to support you on your journey to crack NEET UG!</p><p>Get started by practicing your daily quiz, reviewing flashcards, and tracking your mistakes daily.</p><br/><p>Best regards,<br/>The KARNAN Team</p>"
    },
    "quiz_result_summary": {
        "subject": "Quiz Completed: {quiz_title}",
        "html": "<h3>Hello {display_name},</h3><p>Congratulations on completing your daily locked quiz <b>{quiz_title}</b>!</p><p>Here is your performance summary:</p><ul><li><b>Score:</b> {score} points</li><li><b>Correct Answers:</b> {correct_count}</li><li><b>Incorrect Answers:</b> {wrong_count}</li><li><b>Time Taken:</b> {time_taken} seconds</li></ul><p>Keep up the consistency! Practicing daily is key to maximizing your NEET score.</p><br/><p>Best regards,<br/>The KARNAN Team</p>"
    }
}

def get_supabase_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise Exception("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def process_email_queue(sb: Client):
    print("Processing email queue...")
    
    if not RESEND_API_KEY:
        print("Warning: RESEND_API_KEY not set. Skipping email delivery.")
        return
        
    try:
        # Fetch pending emails
        res = sb.table("email_queue").select("*").eq("status", "pending").limit(10).execute()
        emails = res.data or []
        
        if not emails:
            print("  No pending emails found.")
            return
            
        for e in emails:
            email_id = e["id"]
            recipient = e["recipient_email"]
            template_id = e["template_id"]
            payload = e["payload"] or {}
            
            template = EMAIL_TEMPLATES.get(template_id)
            if not template:
                print(f"  Unknown email template: {template_id} for email ID {email_id}. Marking as failed.")
                sb.table("email_queue").update({"status": "failed", "error_msg": f"Template {template_id} not found."}).eq("id", email_id).execute()
                continue
                
            # Compile template strings
            subject = template["subject"].format(**payload)
            html_content = template["html"].format(**payload)
            
            # Dispatch to Resend API
            print(f"  Sending email '{subject}' to {recipient}...")
            headers = {
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            }
            email_data = {
                "from": "KARNAN Physics <onboarding@resend.dev>", # Default sandbox domain, configure domain verification in production
                "to": [recipient],
                "subject": subject,
                "html": html_content
            }
            
            api_res = requests.post("https://api.resend.com/emails", headers=headers, json=email_data)
            
            if api_res.status_code == 200 or api_res.status_code == 201:
                sb.table("email_queue").update({"status": "sent", "sent_at": "now()"}).eq("id", email_id).execute()
                print(f"    ✓ Sent successfully.")
            else:
                err_text = api_res.text
                print(f"    ❌ Failed to send: {err_text}")
                sb.table("email_queue").update({"status": "failed", "error_msg": err_text}).eq("id", email_id).execute()
                
    except Exception as ex:
        print(f"Error processing email queue: {ex}")

def process_sheets_sync(sb: Client):
    print("Processing Google Sheets sync logs...")
    
    if not GOOGLE_SCRIPT_URL:
        print("Warning: GOOGLE_SCRIPT_URL not set. Skipping sheets sync.")
        return
        
    try:
        # Fetch pending logs
        res = sb.table("google_sheets_sync_logs").select("*").in_("status", ["pending", "failed"]).lt("attempts", 5).limit(10).execute()
        logs = res.data or []
        
        if not logs:
            print("  No pending sync logs found.")
            return
            
        for log in logs:
            log_id = log["id"]
            record_id = log["record_id"]
            attempts = log["attempts"]
            
            # Fetch quiz attempt details
            att_res = sb.table("daily_quiz_attempts").select("*, daily_quizzes(title, publish_date), user_profiles(display_name)").eq("id", record_id).maybe_single().execute()
            attempt = att_res.data
            
            if not attempt:
                print(f"  Associated daily quiz attempt {record_id} not found. Skipping.")
                sb.table("google_sheets_sync_logs").update({"status": "failed", "error_msg": "Quiz attempt not found."}).eq("id", log_id).execute()
                continue
                
            # Compile payload
            payload = {
                "attempt_id": attempt["id"],
                "student_name": attempt["user_profiles"]["display_name"],
                "quiz_title": attempt["daily_quizzes"]["title"],
                "publish_date": attempt["daily_quizzes"]["publish_date"],
                "score": attempt["score"],
                "correct_count": attempt["correct_count"],
                "wrong_count": attempt["wrong_count"],
                "time_taken_seconds": attempt["time_taken"],
                "completed_at": attempt["completed_at"]
            }
            
            # Post to Apps Script Web App
            print(f"  Syncing attempt {record_id} to sheet...")
            headers = {"Content-Type": "application/json"}
            api_res = requests.post(GOOGLE_SCRIPT_URL, headers=headers, json=payload)
            
            if api_res.status_code == 200:
                sb.table("google_sheets_sync_logs").update({"status": "synced", "synced_at": "now()"}).eq("id", log_id).execute()
                print(f"    ✓ Synced successfully.")
            else:
                err_text = api_res.text
                new_attempts = attempts + 1
                new_status = "failed" if new_attempts >= 5 else "pending"
                print(f"    ❌ Sync failed: {err_text}")
                sb.table("google_sheets_sync_logs").update({
                    "status": new_status, 
                    "attempts": new_attempts,
                    "error_msg": f"HTTP {api_res.status_code}: {err_text}"
                }).eq("id", log_id).execute()
                
    except Exception as ex:
        print(f"Error processing sheets sync logs: {ex}")

def main():
    print("=== KARNAN Sync Worker ===")
    try:
        sb = get_supabase_client()
        process_email_queue(sb)
        process_sheets_sync(sb)
    except Exception as ex:
        print(f"Worker execution failed: {ex}")
    print("=== Worker Finished ===")

if __name__ == "__main__":
    main()
