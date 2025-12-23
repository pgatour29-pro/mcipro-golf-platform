# 2025-12-23 Contact Admin on Login Page

## FEATURE OVERVIEW

Added a "Contact Admin" button on the login page allowing guest users (not logged in) to send messages for questions, marketing inquiries, and advertisements.

---

## HOW TO ACCESS

1. Go to Login page (mycaddipro.com)
2. Scroll to bottom of login card
3. Click blue "Contact Admin" button
4. Fill in form and submit

---

## MODAL LAYOUT

```
┌─────────────────────────────────────────┐
│  📧 Contact Admin                     ✕ │
│     Questions, Marketing & Advertisements│
├─────────────────────────────────────────┤
│                                         │
│  Your Name *                            │
│  ┌─────────────────────────────────┐    │
│  │ Enter your name                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Contact Info *                         │
│  ┌─────────────────────────────────┐    │
│  │ Email, Phone, or LINE ID        │    │
│  └─────────────────────────────────┘    │
│  How should we reach you?               │
│                                         │
│  Message Type *                         │
│  ┌─────────────────────────────────┐    │
│  │ -- Select Type --             ▼ │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Message *                              │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │ Write your message here...     │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│                    [Cancel] [Send Message]│
└─────────────────────────────────────────┘
```

---

## MESSAGE TYPES

| Value | Display |
|-------|---------|
| question | ❓ General Question |
| support | 🛠️ Technical Support |
| marketing | 📢 Marketing Inquiry |
| advertisement | 📣 Advertisement |
| partnership | 🤝 Partnership |
| other | 📝 Other |

---

## CODE LOCATIONS

### Button on Login Page
`public/index.html` lines 25701-25708

```html
<!-- Contact Admin Section -->
<div class="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
    <p class="text-sm text-gray-700 mb-3 text-center">Questions, Marketing or Advertisement?</p>
    <button onclick="showContactAdminModal()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center space-x-2 transition-all">
        <span class="material-symbols-outlined text-lg">mail</span>
        <span>Contact Admin</span>
    </button>
</div>
```

### Modal HTML
`public/index.html` lines 25718-25790

### JavaScript Functions
`public/index.html` lines 13403-13504

```javascript
window.showContactAdminModal()      // Opens modal, clears form
window.closeContactAdminModal()     // Closes modal
window.sendContactAdminMessage()    // Validates and sends message
```

---

## MESSAGE FORMAT

When sent, the message is formatted as:

```
📬 CONTACT FORM SUBMISSION

👤 From: John Smith
📞 Contact: john@example.com
📋 Type: 📢 Marketing Inquiry

💬 Message:
I would like to discuss advertising opportunities...

---
Sent from Login Page
```

---

## DATABASE STORAGE

Messages are stored in `direct_messages` table:

```javascript
{
    sender_line_id: 'GUEST_CONTACT',           // Special ID for guests
    recipient_line_id: 'U2b6d976f19bca4b2f4374ae0e10ed873',  // Admin LINE ID
    message_text: formattedMessage
}
```

---

## ADMIN VIEWING

Admin can view these messages in:
1. **Messages tab** → Direct Messages section
2. Messages from "GUEST_CONTACT" are contact form submissions
3. Contact info is embedded in the message text

---

## VALIDATION

All fields are required:
- Name - Must not be empty
- Contact Info - Must not be empty
- Message Type - Must select from dropdown
- Message - Must not be empty

Error notifications shown if validation fails.

---

## STYLING

- **Button Container**: Blue gradient (`from-blue-50 to-indigo-50`)
- **Button**: Indigo (`bg-indigo-600`)
- **Modal Header**: Purple gradient (`from-indigo-600 to-purple-600`)
- **Modal**: White with rounded corners, max-width 32rem (lg)

---

## GUEST ACCESS

This feature works WITHOUT requiring login because:
1. Uses `GUEST_CONTACT` as sender ID
2. Supabase client is initialized on page load
3. `direct_messages` table allows inserts without auth

---

## CONSOLE LOGS

**Success:**
```
[ContactAdmin] Message sent successfully
```

**Error:**
```
[ContactAdmin] Error sending message: {error details}
[ContactAdmin] Error: {exception}
```

---

## COMMIT

- `0a35d945` - feat: Add Contact Admin form on login page

---

**Session Date**: 2025-12-23
**Status**: DEPLOYED
