# MciPro Golf Operations Documentation

## Complete Guide to Staff Management System

Welcome to the MciPro Golf Operations documentation center. This comprehensive guide covers everything you need to know about using the staff management system across all roles and departments.

---

## 📚 Documentation Structure

```
golfoperations/
├── README.md (this file)
├── general-manager/          → GM Dashboard & Management
├── staff-registration/       → How to Register as Staff
├── caddies/                  → Caddy Operations
├── pro-shop/                 → Pro Shop Operations
├── fnb-restaurant/           → F&B/Restaurant Operations
├── maintenance/              → Maintenance Operations
├── security-policies/        → Security & Privacy
└── troubleshooting/          → Common Issues & Solutions
```

---

## 🚀 Quick Start Guides

### For New Staff
**Start Here**: [Staff Registration Guide](./staff-registration/HOW_TO_REGISTER.md)

**What You Need**:
- LINE app installed
- 4-digit registration code from manager
- Your employee ID
- Your department name

**Estimated Time**: 5 minutes

---

### For General Managers
**Start Here**: [General Manager Guide](./general-manager/README.md)

**Quick Start Checklist**: [GM Quick Start](./general-manager/QUICK_START_CHECKLIST.md)

**First Steps**:
1. Set staff registration code
2. Review pending approvals
3. Verify existing staff roster
4. Distribute registration codes to department heads

---

### For Department Heads
1. Get registration code from GM
2. Distribute to your team
3. Guide staff through registration
4. Monitor staff access

---

## 📖 Documentation by Role

### 👔 General Manager

**Primary Documents**:
- [Complete GM Guide](./general-manager/README.md) - Full dashboard manual
- [Quick Start Checklist](./general-manager/QUICK_START_CHECKLIST.md) - Day 1 setup

**Key Responsibilities**:
- Setting/changing staff registration codes
- Approving Manager/Pro Shop/Accounting staff
- Managing staff roster
- Viewing reports and analytics
- System administration

**Most Common Tasks**:
- Change registration code (monthly)
- Approve pending staff
- Deactivate departed staff
- Run reports

---

### 🏌️ Caddies

**Primary Documents**:
- [Caddy Dashboard Guide](./caddies/CADDY_DASHBOARD_GUIDE.md) - Complete user manual

**Key Features**:
- Clock in/out for shifts
- View daily schedule
- Accept/decline assignments
- Start/end rounds
- GPS tracking
- Tips tracking
- Performance ratings

**Most Common Tasks**:
- Check today's schedule
- Clock in for shift
- Start a round
- End a round
- View tips earned

---

### ⛳ Pro Shop Staff

**Primary Documents**:
- [Pro Shop Guide](./pro-shop/PRO_SHOP_GUIDE.md) - Complete operations manual

**Key Features**:
- Point of Sale (POS)
- Inventory management
- Tee time bookings
- Equipment rentals
- Golf lesson coordination
- Daily reports

**Most Common Tasks**:
- Process sales
- Book tee times
- Manage rentals
- Check inventory
- Close out register

---

### 🍽️ Restaurant / F&B Staff

**Primary Documents**:
- [F&B Staff Guide](./fnb-restaurant/FNB_STAFF_GUIDE.md) - Complete service manual

**Key Features**:
- Table management
- Order taking (POS)
- Beverage cart operations
- Payment processing
- Tips tracking
- Daily reports

**Most Common Tasks**:
- Take orders
- Process payments
- Manage tables
- Operate beverage cart
- Close out shift

---

### 🔧 Maintenance Staff

**Primary Documents**:
- [Maintenance Guide](./maintenance/MAINTENANCE_GUIDE.md) *(coming soon)*

**Key Features**:
- Work order management
- Equipment tracking
- Inventory management
- Schedule coordination

---

### 🔐 Security & Policies

**Primary Documents**:
- [Security Architecture](./security-policies/SECURITY_ARCHITECTURE.md) - Complete security system

**Topics Covered**:
- 4-layer security system
- Golf course codes
- Employee ID validation
- Approval queue process
- LINE phone lock
- Data privacy (PDPA)
- Security best practices
- Incident response

**For All Staff**:
- Keep registration code confidential
- Secure your LINE account
- Report security issues immediately
- Follow data protection policies

---

## 🆘 Troubleshooting

### Quick Problem Solving

**Can't Register?**
→ [Registration Issues](./troubleshooting/COMMON_ISSUES.md#registration-issues)

**Can't Log In?**
→ [Login Issues](./troubleshooting/COMMON_ISSUES.md#login-issues)

**Dashboard Not Working?**
→ [Dashboard Issues](./troubleshooting/COMMON_ISSUES.md#dashboard-issues)

**Payment Problems?**
→ [Payment Issues](./troubleshooting/COMMON_ISSUES.md#paymenttransaction-issues)

**GPS Not Working?**
→ [GPS Issues](./troubleshooting/COMMON_ISSUES.md#gpslocation-not-working-caddies)

**Complete Troubleshooting Guide**: [Common Issues & Solutions](./troubleshooting/COMMON_ISSUES.md)

---

## 📋 Registration Process Overview

### For Golfers (Unchanged)
```
1. Click "Log in with LINE"
2. Authenticate with LINE
3. Create profile (one-click)
4. Access dashboard
```
**Time**: 30 seconds | **Approval**: Not required

---

### For Staff (New Security Flow)

#### Non-Sensitive Roles (Instant Access)
**Roles**: Caddies, F&B, Maintenance, Reception, Security

```
1. Click "I'm Staff/Caddie"
2. Enter golf course code (4 digits)
3. Select department
4. Enter employee ID (e.g., PAT-023)
5. Verification passes
6. Log in with LINE
7. Create profile
8. Access dashboard (immediate)
```
**Time**: 2-3 minutes | **Approval**: Not required

---

#### Sensitive Roles (Requires Approval)
**Roles**: Managers, Pro Shop, Accounting

```
1-7. (Same as above)
8. Status: "Pending Approval"
9. Wait for manager approval
10. Receive LINE notification
11. Access dashboard
```
**Time**: 2-3 minutes + wait for approval (1-24 hours)

---

## 🔑 Key Concepts

### Golf Course Registration Code
- **What**: 4-digit security code (e.g., 1234)
- **Who Sets**: General Manager
- **Who Needs**: All staff for registration
- **How Often Changed**: Monthly (recommended)
- **Where Found**: Ask your manager

### Employee ID
- **What**: Unique identifier (e.g., PAT-023, PS-001)
- **Format**: Varies by department
- **Who Assigns**: Manager/Supervisor
- **Purpose**: Identity verification, no duplicates

### LINE Authentication
- **What**: Secure login via LINE app
- **Why**: Phone number verification, security
- **Requirement**: Must have LINE account
- **Benefit**: One-click login after registration

### Approval Queue
- **What**: Manager review before access
- **Who**: Managers, Pro Shop, Accounting only
- **Why**: Extra security for sensitive roles
- **How Long**: Usually within 24 hours

---

## 📱 System Access

### Platform URL
```
https://mcipro-golf-platform.netlify.app
```

### Staff Verification URL (First-Time Registration)
```
https://mcipro-golf-platform.netlify.app/staff-verification.html
```

### Recommended Setup
- Bookmark platform URL on phone home screen
- Enable notifications for LINE
- Keep app updated
- Use WiFi when available

---

## 👥 Getting Help

### For Registration Help
**Contact**: Your hiring manager or department supervisor
**Info Needed**: Registration code and employee ID format

### For Technical Support
**Email**: support@mcipro.com
**Phone**: [Your support number]
**Hours**: [Your support hours]
**Response Time**: Usually within 4 hours

### For Approval Status
**Contact**: Your hiring manager
**Check**: Staff Management → Pending Approvals

### For Security Issues
**Contact**: General Manager or IT Security
**Email**: security@mcipro.com
**Action**: Report immediately, don't wait

---

## 🎓 Training Resources

### Video Tutorials (Coming Soon)
- Staff registration walkthrough
- Dashboard navigation
- Common tasks by role
- Troubleshooting basics

### Live Training
- Scheduled by department
- Contact your manager
- On-site training available

### Practice Environment
- Test account available
- Practice without affecting live data
- Contact IT for access

---

## 📊 System Features by Role

| Feature | Golfer | Caddy | Pro Shop | F&B | Manager |
|---------|--------|-------|----------|-----|---------|
| Profile Management | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tee Time Booking | ✓ | ✗ | ✓ | ✗ | ✓ |
| Schedule View | ✗ | ✓ | ✓ | ✓ | ✓ |
| GPS Tracking | ✗ | ✓ | ✗ | ✗ | ✓ |
| POS/Sales | ✗ | ✗ | ✓ | ✓ | ✓ |
| Inventory | ✗ | ✗ | ✓ | ✗ | ✓ |
| Staff Management | ✗ | ✗ | ✗ | ✗ | ✓ |
| Reports | ✗ | View Own | View Own | View Own | All |
| Approve Staff | ✗ | ✗ | ✗ | ✗ | ✓ |

---

## 🔄 Update Schedule

**This Documentation**:
- Reviewed: Monthly
- Updated: As features change
- Version tracking: Date + version number

**System Updates**:
- Feature updates: Announced in advance
- Security patches: Automatic
- Maintenance: Scheduled off-peak hours

**Staying Informed**:
- Check announcements in dashboard
- LINE notifications for important updates
- Review release notes monthly

---

## 📝 Document Versions

| Document | Version | Last Updated | Next Review |
|----------|---------|--------------|-------------|
| GM Guide | 1.0 | Oct 7, 2025 | Nov 7, 2025 |
| Registration Guide | 1.0 | Oct 7, 2025 | Nov 7, 2025 |
| Caddy Guide | 1.0 | Oct 7, 2025 | Nov 7, 2025 |
| Pro Shop Guide | 1.0 | Oct 7, 2025 | Nov 7, 2025 |
| F&B Guide | 1.0 | Oct 7, 2025 | Nov 7, 2025 |
| Security Policies | 1.0 | Oct 7, 2025 | Nov 7, 2025 |
| Troubleshooting | 1.0 | Oct 7, 2025 | Nov 7, 2025 |

---

## 🗺️ Quick Navigation

### By Task

**I need to register as new staff**
→ [Staff Registration Guide](./staff-registration/HOW_TO_REGISTER.md)

**I need to set up staff security**
→ [GM Quick Start](./general-manager/QUICK_START_CHECKLIST.md)

**I need to approve pending staff**
→ [GM Guide - Approvals](./general-manager/README.md#2-approving-new-staff-registrations)

**I need to change registration code**
→ [GM Guide - Code Management](./general-manager/README.md#1-setting-up-staff-registration-code)

**I can't log in**
→ [Troubleshooting - Login](./troubleshooting/COMMON_ISSUES.md#login-issues)

**I need to learn my dashboard**
→ Find your role above and click guide link

---

## 💡 Tips for Success

### For All Users
- Keep LINE app updated
- Enable notifications
- Bookmark the platform
- Check dashboard daily
- Report issues promptly
- Follow security best practices

### For Managers
- Change registration codes monthly
- Review pending approvals daily
- Audit staff roster weekly
- Train new staff thoroughly
- Document policy changes
- Communicate updates clearly

### For Staff
- Complete registration carefully
- Keep credentials secure
- Learn your dashboard features
- Ask questions when unsure
- Provide feedback to improve system
- Help train new colleagues

---

## 📞 Contact Directory

**General Manager**: [Name, Phone, Email]

**IT Support**: support@mcipro.com, [Phone]

**Security**: security@mcipro.com, [Phone]

**HR Department**: [Contact info]

**Caddy Master**: [Name, Phone]

**Pro Shop Manager**: [Name, Phone]

**F&B Manager**: [Name, Phone]

**Maintenance Supervisor**: [Name, Phone]

---

## 🎯 Goals & Mission

**Our Mission**: Streamline golf course operations while maintaining the highest security and user experience standards.

**System Goals**:
- ✓ Secure staff access control
- ✓ Easy registration for legitimate staff
- ✓ Efficient daily operations
- ✓ Accurate reporting and analytics
- ✓ Excellent customer service
- ✓ Scalable across multiple courses

**Your Success**: When every staff member can efficiently use the system to deliver exceptional golf course experiences.

---

## 📜 Policies & Compliance

**Data Privacy**: PDPA compliant - see [Security Policies](./security-policies/SECURITY_ARCHITECTURE.md#compliance--privacy)

**Access Control**: Role-based permissions - see [Security Policies](./security-policies/SECURITY_ARCHITECTURE.md#access-control-policy)

**Security Standards**: 4-layer defense - see [Security Architecture](./security-policies/SECURITY_ARCHITECTURE.md)

**Staff Conduct**: Follow golf course employee handbook

**Technology Use**: Appropriate use of systems and data

---

## 🔗 External Resources

**LINE Platform**: https://line.me/

**LINE Business**: https://www.linebiz.com/

**Support Portal**: [Your support portal URL]

**Training Videos**: [Your video library URL]

**Knowledge Base**: [Your KB URL]

---

## ✨ What's New

**October 2025**:
- ✓ Complete staff security system implemented
- ✓ Golf course registration codes
- ✓ Employee ID validation
- ✓ Manager approval queue
- ✓ Comprehensive documentation created

**Coming Soon**:
- Video tutorials for each role
- Mobile app improvements
- Enhanced reporting features
- Multi-language support
- Advanced analytics

---

## 📣 Feedback & Suggestions

**We Want to Hear From You!**

**Suggestions**: How can we improve the system or documentation?

**Issues**: Found a bug or problem?

**Success Stories**: Share how the system helped you!

**Contact**: feedback@mcipro.com

**Response Time**: We review all feedback weekly

---

## 📚 Related Documentation

**Technical Documentation**:
- [Complete Implementation Doc](../STAFF_SECURITY_IMPLEMENTATION.md)
- [Staff Security Code](../staff-security.js)
- [Staff Verification Page](../staff-verification.html)

**For Developers**:
- System architecture
- API documentation
- Integration guides
- Custom development

---

**🏌️ Welcome to MciPro Golf Operations!**

*Making golf course management simple, secure, and efficient.*

---

**Last Updated**: October 7, 2025
**Documentation Version**: 1.0
**System Version**: 1.0
**© 2025 MciPro Golf Management Systems**
