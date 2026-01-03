/**
 * Pro Shop Tee Sheet Integration
 * Bridges the React-based tee sheet to MciPro's booking and caddy systems
 */

(function() {
    'use strict';

    // ============= CONFIGURATION =============
    const COURSE_CONFIG = {
        'pattana-golf-resort': {
            name: 'Pattana Golf Resort',
            lanes: [
                { courseId: 'course-a', label: 'Course A', labelTh: 'สนาม เอ', labelKo: '코스 A', color: '#86efac' },
                { courseId: 'course-b', label: 'Course B', labelTh: 'สนาม บี', labelKo: '코스 B', color: '#7dd3fc' },
                { courseId: 'course-c', label: 'Course C', labelTh: 'สนาม ซี', labelKo: '코스 C', color: '#fde047' }
            ],
            teesPerCourse: 2
        },
        'pattaya-golf-club': {
            name: 'Pattaya Golf Club',
            lanes: [{ courseId: 'main', label: 'Main Course', labelTh: 'สนามหลัก', labelKo: '메인 코스', color: '#86efac' }],
            teesPerCourse: 2
        },
        'thai-country-club': {
            name: 'Thai Country Club',
            lanes: [{ courseId: 'main', label: 'Main Course', labelTh: 'สนามหลัก', labelKo: '메인 코스', color: '#7dd3fc' }],
            teesPerCourse: 2
        },
        'siam-plantation': {
            name: 'Siam Plantation',
            lanes: [{ courseId: 'main', label: 'Main Course', labelTh: 'สนามหลัก', labelKo: '메인 코스', color: '#fde047' }],
            teesPerCourse: 2
        },
        'royal-garden': {
            name: 'Royal Garden',
            lanes: [{ courseId: 'main', label: 'Main Course', labelTh: 'สนามหลัก', labelKo: '메인 코스', color: '#c4b5fd' }],
            teesPerCourse: 2
        },
        'bangpra-international': {
            name: 'Bangpra International',
            lanes: [{ courseId: 'main', label: 'Main Course', labelTh: 'สนามหลัก', labelKo: '메인 코스', color: '#fca5a5' }],
            teesPerCourse: 2
        },
        'crystal-bay': {
            name: 'Crystal Bay',
            lanes: [{ courseId: 'main', label: 'Main Course', labelTh: 'สนามหลัก', labelKo: '메인 코스', color: '#a5b4fc' }],
            teesPerCourse: 2
        },
        'laem-chabang': {
            name: 'Laem Chabang',
            lanes: [{ courseId: 'main', label: 'Main Course', labelTh: 'สนามหลัก', labelKo: '메인 코스', color: '#86efac' }],
            teesPerCourse: 2
        }
    };

    // ============= DATA BRIDGE =============
    const MciProBridge = {
        // Get caddies for a specific course
        getCaddiesForCourse(courseId) {
            if (!window.CaddySystem || !window.CaddySystem.allCaddys) {
                console.warn('[TeeSheet] CaddySystem not available');
                return [];
            }

            const allCaddies = window.CaddySystem.allCaddys;
            const courseCaddies = allCaddies.filter(c => c.homeClub === courseId);

            // Map to tee sheet format
            return courseCaddies.map(c => ({
                id: c.id,
                number: c.number || c.id.replace(/\D/g, '').padStart(3, '0'),
                name: c.name,
                nameEn: c.name,
                nameTh: c.name,
                nameKo: c.name,
                rating: c.rating || 4.5,
                languages: c.languages || ['Thai', 'English'],
                status: c.availability === 'booked' ? 'booked' : 'available'
            }));
        },

        // Get all caddies
        getAllCaddies() {
            if (!window.CaddySystem || !window.CaddySystem.allCaddys) {
                return [];
            }
            return window.CaddySystem.allCaddys.map(c => ({
                id: c.id,
                number: c.number || c.id.replace(/\D/g, '').padStart(3, '0'),
                name: c.name,
                nameEn: c.name,
                nameTh: c.name,
                nameKo: c.name,
                rating: c.rating || 4.5,
                languages: c.languages || ['Thai', 'English'],
                status: c.availability === 'booked' ? 'booked' : 'available',
                homeClub: c.homeClub
            }));
        },

        // Get bookings for a date and course
        getBookingsForDate(date, courseId) {
            if (!window.BookingManager || !window.BookingManager.bookings) {
                console.warn('[TeeSheet] BookingManager not available');
                return [];
            }

            const allBookings = window.BookingManager.bookings;
            return allBookings.filter(b => {
                if (b.deleted) return false;
                if (b.date !== date) return false;

                // Match by courseId
                if (courseId) {
                    const bookingCourse = b.courseId || b.course_id;
                    if (bookingCourse && bookingCourse !== courseId) return false;
                }

                return true;
            }).map(b => this.mapBookingToTeeSheet(b));
        },

        // Map MciPro booking to tee sheet format
        mapBookingToTeeSheet(booking) {
            return {
                id: booking.id,
                time: booking.teeTime || booking.time,
                golfers: [{
                    id: booking.golferId || booking.golfer_id || 'g1',
                    name: booking.golferName || booking.name || 'Guest',
                    handicap: booking.handicap || 0,
                    inputLang: 'en'
                }],
                bookingType: booking.bookingType || 'regular',
                status: booking.status || 'confirmed',
                notes: booking.notes || '',
                notesLang: 'en',
                caddyBookings: (booking.caddyBookings || []).map(cb => ({
                    golferId: cb.golferId,
                    caddyId: cb.caddyId,
                    golferName: cb.golferName,
                    caddyName: cb.caddyName,
                    caddyNumber: cb.caddyNumber,
                    status: cb.status || 'confirmed'
                })),
                source: booking.source || 'teesheet',
                courseId: booking.courseId,
                teeSheetCourse: booking.teeSheetCourse
            };
        },

        // Save booking to MciPro
        async saveBooking(booking, slot, courseId, courseName) {
            if (!window.BookingManager) {
                console.error('[TeeSheet] BookingManager not available');
                return false;
            }

            try {
                // Map tee sheet booking to MciPro format
                const mciProBooking = {
                    id: booking.id || `teesheet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    kind: 'tee',
                    date: slot.time.split('T')[0] || new Date().toISOString().split('T')[0],
                    time: slot.time.includes('T') ? slot.time.split('T')[1].substring(0, 5) : slot.time,
                    teeTime: slot.time,
                    golferId: booking.golfers[0]?.id || 'guest',
                    golferName: booking.golfers[0]?.name || 'Guest',
                    players: booking.golfers.length,
                    course: courseName,
                    courseId: courseId,
                    teeSheetCourse: slot.courseId || 'Course A',
                    status: booking.status || 'confirmed',
                    bookingType: booking.bookingType || 'regular',
                    notes: booking.notes || '',
                    source: 'teesheet',
                    caddyBookings: (booking.caddyBookings || []).map(cb => ({
                        golferId: cb.golferId,
                        caddyId: cb.caddyId,
                        golferName: cb.golferName,
                        caddyName: cb.caddyName,
                        caddyNumber: cb.caddyNumber,
                        status: cb.status || 'confirmed'
                    })),
                    updatedAt: Date.now(),
                    createdAt: Date.now()
                };

                // Add to BookingManager
                window.BookingManager.addBooking(mciProBooking);
                window.BookingManager.saveToLocalStorage();

                // Sync to cloud
                if (window.SimpleCloudSync && window.SimpleCloudSync.saveToCloud) {
                    await window.SimpleCloudSync.saveToCloud();
                }

                console.log('[TeeSheet] Booking saved:', mciProBooking.id);
                return true;
            } catch (error) {
                console.error('[TeeSheet] Error saving booking:', error);
                return false;
            }
        },

        // Delete booking
        async deleteBooking(bookingId) {
            if (!window.BookingManager) return false;

            try {
                const booking = window.BookingManager.bookings.find(b => b.id === bookingId);
                if (booking) {
                    booking.deleted = true;
                    booking.status = 'cancelled';
                    window.BookingManager.saveToLocalStorage();

                    if (window.SimpleCloudSync && window.SimpleCloudSync.saveToCloud) {
                        await window.SimpleCloudSync.saveToCloud();
                    }
                }
                return true;
            } catch (error) {
                console.error('[TeeSheet] Error deleting booking:', error);
                return false;
            }
        }
    };

    // ============= HELPER FUNCTIONS =============
    function buildTimes(startTime, endTime, intervalMinutes) {
        const times = [];
        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        let currentMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        while (currentMinutes <= endMinutes) {
            const hours = Math.floor(currentMinutes / 60);
            const mins = currentMinutes % 60;
            times.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
            currentMinutes += intervalMinutes;
        }

        return times;
    }

    function detectLanguage(text) {
        if (!text) return 'en';
        if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
        if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)) return 'ko';
        if (/[\u3040-\u30FF\u4E00-\u9FFF]/.test(text)) return 'ja';
        return 'en';
    }

    // ============= LOAD REACT AND RENDER =============
    function loadReactDependencies(callback) {
        // Check if React is already loaded
        if (window.React && window.ReactDOM) {
            console.log('[TeeSheet] React already loaded');
            callback();
            return;
        }

        let loaded = 0;
        const scripts = [
            'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js'
        ];

        scripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                loaded++;
                if (loaded === scripts.length) {
                    console.log('[TeeSheet] React dependencies loaded');
                    callback();
                }
            };
            script.onerror = (e) => {
                console.error('[TeeSheet] Failed to load:', src, e);
            };
            document.head.appendChild(script);
        });
    }

    // ============= SIMPLIFIED TEE SHEET COMPONENT =============
    function renderTeeSheet(container) {
        const React = window.React;
        const { useState, useEffect, useMemo } = React;

        // Translations
        const translations = {
            en: {
                selectCourse: 'Select Course',
                date: 'Date',
                timeRange: 'Time Range',
                interval: 'Interval',
                refresh: 'Refresh',
                booking: 'Booking',
                golfers: 'Golfers',
                caddies: 'Caddies',
                notes: 'Notes',
                save: 'Save Booking',
                cancel: 'Cancel',
                empty: 'Click to book',
                booked: 'Booked',
                locked: 'Locked',
                players: 'players',
                noBookings: 'No bookings for this date',
                addGolfer: 'Add Golfer',
                assignCaddy: 'Assign Caddy',
                golferName: 'Golfer Name',
                handicap: 'Handicap',
                search: 'Search golfer or caddy...',
                findNext: 'Find Next',
                bookingType: 'Booking Type',
                regular: 'Regular',
                vip: 'VIP',
                society: 'Society',
                tournament: 'Tournament'
            },
            th: {
                selectCourse: 'เลือกสนาม',
                date: 'วันที่',
                timeRange: 'ช่วงเวลา',
                interval: 'ระยะห่าง',
                refresh: 'รีเฟรช',
                booking: 'การจอง',
                golfers: 'นักกอล์ฟ',
                caddies: 'แคดดี้',
                notes: 'หมายเหตุ',
                save: 'บันทึกการจอง',
                cancel: 'ยกเลิก',
                empty: 'คลิกเพื่อจอง',
                booked: 'จองแล้ว',
                locked: 'ล็อค',
                players: 'ผู้เล่น',
                noBookings: 'ไม่มีการจองสำหรับวันนี้',
                addGolfer: 'เพิ่มนักกอล์ฟ',
                assignCaddy: 'กำหนดแคดดี้',
                golferName: 'ชื่อนักกอล์ฟ',
                handicap: 'แฮนดิแคป',
                search: 'ค้นหานักกอล์ฟหรือแคดดี้...',
                findNext: 'หาถัดไป',
                bookingType: 'ประเภทการจอง',
                regular: 'ปกติ',
                vip: 'วีไอพี',
                society: 'สังคม',
                tournament: 'ทัวร์นาเมนต์'
            }
        };

        // Main TeeSheet Component
        function ProShopTeeSheet() {
            const [language, setLanguage] = useState('en');
            const [selectedCourse, setSelectedCourse] = useState('pattana-golf-resort');
            const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
            const [startTime, setStartTime] = useState('06:00');
            const [endTime, setEndTime] = useState('17:00');
            const [interval, setInterval] = useState(10);
            const [bookings, setBookings] = useState([]);
            const [selectedSlot, setSelectedSlot] = useState(null);
            const [modalOpen, setModalOpen] = useState(false);
            const [searchTerm, setSearchTerm] = useState('');

            const t = (key) => translations[language]?.[key] || translations.en[key] || key;
            const courseConfig = COURSE_CONFIG[selectedCourse] || COURSE_CONFIG['pattana-golf-resort'];
            const caddies = useMemo(() => MciProBridge.getCaddiesForCourse(selectedCourse), [selectedCourse]);

            // Load bookings when date or course changes
            useEffect(() => {
                const loadedBookings = MciProBridge.getBookingsForDate(selectedDate, selectedCourse);
                setBookings(loadedBookings);
                console.log('[TeeSheet] Loaded', loadedBookings.length, 'bookings for', selectedDate);
            }, [selectedDate, selectedCourse]);

            // Build time slots
            const timeSlots = useMemo(() => buildTimes(startTime, endTime, interval), [startTime, endTime, interval]);

            // Build rows with slots
            const rows = useMemo(() => {
                return timeSlots.map(time => {
                    const slots = [];
                    courseConfig.lanes.forEach(lane => {
                        for (let tee = 1; tee <= courseConfig.teesPerCourse; tee++) {
                            const slotId = `${time}-${lane.courseId}-${tee}`;
                            const booking = bookings.find(b => {
                                const bookingTime = b.time?.includes('T') ? b.time.split('T')[1].substring(0, 5) : b.time;
                                return bookingTime === time &&
                                       (b.teeSheetCourse === lane.label || b.courseId === lane.courseId);
                            });

                            slots.push({
                                id: slotId,
                                time: time,
                                courseId: lane.courseId,
                                teeNumber: tee,
                                laneLabel: lane.label,
                                laneColor: lane.color,
                                booking: booking || null,
                                capacity: 4
                            });
                        }
                    });
                    return { time, slots };
                });
            }, [timeSlots, courseConfig, bookings]);

            // Handle slot click
            const handleSlotClick = (slot) => {
                setSelectedSlot(slot);
                setModalOpen(true);
            };

            // Handle save booking
            const handleSaveBooking = async (bookingData) => {
                const success = await MciProBridge.saveBooking(
                    bookingData,
                    selectedSlot,
                    selectedCourse,
                    courseConfig.name
                );

                if (success) {
                    // Reload bookings
                    const loadedBookings = MciProBridge.getBookingsForDate(selectedDate, selectedCourse);
                    setBookings(loadedBookings);
                    setModalOpen(false);
                    setSelectedSlot(null);
                }
            };

            // Render header columns
            const headerCols = useMemo(() => {
                const cols = [];
                courseConfig.lanes.forEach(lane => {
                    for (let tee = 1; tee <= courseConfig.teesPerCourse; tee++) {
                        cols.push({
                            key: `${lane.courseId}-${tee}`,
                            label: `${lane.label.replace('Course ', '')}${courseConfig.teesPerCourse > 1 ? `-${tee}` : ''}`,
                            color: lane.color
                        });
                    }
                });
                return cols;
            }, [courseConfig]);

            return React.createElement('div', { className: 'bg-white rounded-xl shadow-lg border border-gray-200' },
                // Header
                React.createElement('div', { className: 'bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200 px-6 py-4 rounded-t-xl' },
                    React.createElement('div', { className: 'flex flex-wrap items-center gap-4' },
                        // Course selector
                        React.createElement('div', { className: 'flex items-center gap-2' },
                            React.createElement('label', { className: 'text-sm font-medium text-gray-700' }, t('selectCourse')),
                            React.createElement('select', {
                                value: selectedCourse,
                                onChange: (e) => setSelectedCourse(e.target.value),
                                className: 'rounded-lg border-gray-300 text-sm focus:ring-purple-500 focus:border-purple-500'
                            },
                                Object.entries(COURSE_CONFIG).map(([id, config]) =>
                                    React.createElement('option', { key: id, value: id }, config.name)
                                )
                            )
                        ),
                        // Date picker
                        React.createElement('div', { className: 'flex items-center gap-2' },
                            React.createElement('label', { className: 'text-sm font-medium text-gray-700' }, t('date')),
                            React.createElement('input', {
                                type: 'date',
                                value: selectedDate,
                                onChange: (e) => setSelectedDate(e.target.value),
                                className: 'rounded-lg border-gray-300 text-sm focus:ring-purple-500 focus:border-purple-500'
                            })
                        ),
                        // Time range
                        React.createElement('div', { className: 'flex items-center gap-2' },
                            React.createElement('label', { className: 'text-sm font-medium text-gray-700' }, t('timeRange')),
                            React.createElement('input', {
                                type: 'time',
                                value: startTime,
                                onChange: (e) => setStartTime(e.target.value),
                                className: 'rounded-lg border-gray-300 text-sm w-24'
                            }),
                            React.createElement('span', { className: 'text-gray-500' }, '-'),
                            React.createElement('input', {
                                type: 'time',
                                value: endTime,
                                onChange: (e) => setEndTime(e.target.value),
                                className: 'rounded-lg border-gray-300 text-sm w-24'
                            })
                        ),
                        // Interval selector
                        React.createElement('div', { className: 'flex items-center gap-2' },
                            React.createElement('label', { className: 'text-sm font-medium text-gray-700' }, t('interval')),
                            React.createElement('select', {
                                value: interval,
                                onChange: (e) => setInterval(Number(e.target.value)),
                                className: 'rounded-lg border-gray-300 text-sm'
                            },
                                React.createElement('option', { value: 7 }, '7 min'),
                                React.createElement('option', { value: 8 }, '8 min'),
                                React.createElement('option', { value: 10 }, '10 min')
                            )
                        ),
                        // Language toggle
                        React.createElement('div', { className: 'flex items-center gap-1 ml-auto' },
                            ['en', 'th'].map(lang =>
                                React.createElement('button', {
                                    key: lang,
                                    onClick: () => setLanguage(lang),
                                    className: `px-3 py-1 text-sm rounded-lg ${language === lang ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`
                                }, lang.toUpperCase())
                            )
                        ),
                        // Search
                        React.createElement('div', { className: 'relative' },
                            React.createElement('input', {
                                type: 'text',
                                value: searchTerm,
                                onChange: (e) => setSearchTerm(e.target.value),
                                placeholder: t('search'),
                                className: 'pl-10 pr-4 py-2 rounded-lg border-gray-300 text-sm w-64'
                            }),
                            React.createElement('span', {
                                className: 'material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg'
                            }, 'search')
                        )
                    )
                ),
                // Tee Sheet Grid
                React.createElement('div', { className: 'overflow-x-auto' },
                    React.createElement('table', { className: 'w-full' },
                        // Table Header
                        React.createElement('thead', { className: 'bg-gray-50' },
                            React.createElement('tr', null,
                                React.createElement('th', { className: 'px-3 py-2 text-left text-xs font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10' }, 'Time'),
                                headerCols.map(col =>
                                    React.createElement('th', {
                                        key: col.key,
                                        className: 'px-2 py-2 text-center text-xs font-semibold text-gray-700',
                                        style: { backgroundColor: col.color + '40' }
                                    }, col.label)
                                )
                            )
                        ),
                        // Table Body
                        React.createElement('tbody', null,
                            rows.map(row =>
                                React.createElement('tr', {
                                    key: row.time,
                                    className: 'border-t border-gray-100 hover:bg-gray-50'
                                },
                                    React.createElement('td', {
                                        className: 'px-3 py-1 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-100'
                                    }, row.time),
                                    row.slots.map(slot =>
                                        React.createElement('td', {
                                            key: slot.id,
                                            onClick: () => handleSlotClick(slot),
                                            className: `px-1 py-1 cursor-pointer transition-colors ${
                                                slot.booking
                                                    ? 'bg-blue-100 hover:bg-blue-200'
                                                    : 'hover:bg-purple-50'
                                            }`,
                                            style: { minWidth: '80px' }
                                        },
                                            slot.booking
                                                ? React.createElement('div', { className: 'text-xs' },
                                                    React.createElement('div', { className: 'font-medium text-blue-800 truncate' },
                                                        slot.booking.golfers?.[0]?.name || 'Booked'
                                                    ),
                                                    React.createElement('div', { className: 'text-blue-600' },
                                                        `${slot.booking.golfers?.length || 1} ${t('players')}`
                                                    )
                                                )
                                                : React.createElement('div', { className: 'text-xs text-gray-400 text-center py-2' }, t('empty'))
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
                // Booking Modal
                modalOpen && React.createElement(BookingModal, {
                    slot: selectedSlot,
                    caddies: caddies,
                    language: language,
                    t: t,
                    onSave: handleSaveBooking,
                    onClose: () => { setModalOpen(false); setSelectedSlot(null); }
                })
            );
        }

        // Booking Modal Component
        function BookingModal({ slot, caddies, language, t, onSave, onClose }) {
            const [golfers, setGolfers] = useState(
                slot.booking?.golfers || [{ id: 'g1', name: '', handicap: 0, inputLang: 'en' }]
            );
            const [caddyAssignments, setCaddyAssignments] = useState(
                slot.booking?.caddyBookings || []
            );
            const [notes, setNotes] = useState(slot.booking?.notes || '');
            const [bookingType, setBookingType] = useState(slot.booking?.bookingType || 'regular');

            const addGolfer = () => {
                if (golfers.length < 4) {
                    setGolfers([...golfers, { id: `g${golfers.length + 1}`, name: '', handicap: 0, inputLang: 'en' }]);
                }
            };

            const updateGolfer = (index, field, value) => {
                const updated = [...golfers];
                updated[index] = { ...updated[index], [field]: value };
                if (field === 'name') {
                    updated[index].inputLang = detectLanguage(value);
                }
                setGolfers(updated);
            };

            const removeGolfer = (index) => {
                if (golfers.length > 1) {
                    setGolfers(golfers.filter((_, i) => i !== index));
                }
            };

            const assignCaddy = (golferIndex, caddy) => {
                const golfer = golfers[golferIndex];
                const existing = caddyAssignments.findIndex(ca => ca.golferId === golfer.id);

                if (existing >= 0) {
                    const updated = [...caddyAssignments];
                    updated[existing] = {
                        golferId: golfer.id,
                        caddyId: caddy.id,
                        golferName: golfer.name,
                        caddyName: caddy.name,
                        caddyNumber: caddy.number,
                        status: 'confirmed'
                    };
                    setCaddyAssignments(updated);
                } else {
                    setCaddyAssignments([...caddyAssignments, {
                        golferId: golfer.id,
                        caddyId: caddy.id,
                        golferName: golfer.name,
                        caddyName: caddy.name,
                        caddyNumber: caddy.number,
                        status: 'confirmed'
                    }]);
                }
            };

            const handleSave = () => {
                onSave({
                    id: slot.booking?.id || null,
                    golfers: golfers.filter(g => g.name.trim()),
                    caddyBookings: caddyAssignments,
                    notes,
                    notesLang: detectLanguage(notes),
                    bookingType,
                    status: 'confirmed'
                });
            };

            return React.createElement('div', {
                className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
                onClick: (e) => e.target === e.currentTarget && onClose()
            },
                React.createElement('div', {
                    className: 'bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto',
                    onClick: (e) => e.stopPropagation()
                },
                    // Modal Header
                    React.createElement('div', { className: 'bg-purple-600 text-white px-6 py-4 rounded-t-xl' },
                        React.createElement('div', { className: 'flex justify-between items-center' },
                            React.createElement('h3', { className: 'text-lg font-bold' },
                                `${t('booking')} - ${slot.time} (${slot.laneLabel})`
                            ),
                            React.createElement('button', {
                                onClick: onClose,
                                className: 'text-white hover:text-gray-200'
                            },
                                React.createElement('span', { className: 'material-symbols-outlined' }, 'close')
                            )
                        )
                    ),
                    // Modal Body
                    React.createElement('div', { className: 'p-6 space-y-6' },
                        // Booking Type
                        React.createElement('div', null,
                            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, t('bookingType')),
                            React.createElement('div', { className: 'flex gap-2' },
                                ['regular', 'vip', 'society', 'tournament'].map(type =>
                                    React.createElement('button', {
                                        key: type,
                                        onClick: () => setBookingType(type),
                                        className: `px-3 py-1 text-sm rounded-lg ${
                                            bookingType === type
                                                ? type === 'vip' ? 'bg-amber-500 text-white'
                                                : type === 'society' ? 'bg-blue-500 text-white'
                                                : type === 'tournament' ? 'bg-green-500 text-white'
                                                : 'bg-purple-600 text-white'
                                                : 'bg-gray-200 text-gray-700'
                                        }`
                                    }, t(type))
                                )
                            )
                        ),
                        // Golfers
                        React.createElement('div', null,
                            React.createElement('div', { className: 'flex justify-between items-center mb-3' },
                                React.createElement('label', { className: 'text-sm font-medium text-gray-700' }, t('golfers')),
                                golfers.length < 4 && React.createElement('button', {
                                    onClick: addGolfer,
                                    className: 'text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1'
                                },
                                    React.createElement('span', { className: 'material-symbols-outlined text-lg' }, 'add'),
                                    t('addGolfer')
                                )
                            ),
                            React.createElement('div', { className: 'space-y-3' },
                                golfers.map((golfer, index) => {
                                    const assignment = caddyAssignments.find(ca => ca.golferId === golfer.id);
                                    return React.createElement('div', {
                                        key: golfer.id,
                                        className: 'flex gap-3 items-start p-3 bg-gray-50 rounded-lg'
                                    },
                                        React.createElement('div', { className: 'flex-1 space-y-2' },
                                            React.createElement('input', {
                                                type: 'text',
                                                value: golfer.name,
                                                onChange: (e) => updateGolfer(index, 'name', e.target.value),
                                                placeholder: t('golferName'),
                                                className: 'w-full rounded-lg border-gray-300 text-sm'
                                            }),
                                            React.createElement('div', { className: 'flex gap-2 items-center' },
                                                React.createElement('input', {
                                                    type: 'number',
                                                    value: golfer.handicap,
                                                    onChange: (e) => updateGolfer(index, 'handicap', Number(e.target.value)),
                                                    placeholder: t('handicap'),
                                                    className: 'w-20 rounded-lg border-gray-300 text-sm',
                                                    min: 0,
                                                    max: 54
                                                }),
                                                React.createElement('span', { className: 'text-xs text-gray-500' }, 'HCP')
                                            )
                                        ),
                                        // Caddy assignment
                                        React.createElement('div', { className: 'w-48' },
                                            React.createElement('select', {
                                                value: assignment?.caddyId || '',
                                                onChange: (e) => {
                                                    const caddy = caddies.find(c => c.id === e.target.value);
                                                    if (caddy) assignCaddy(index, caddy);
                                                },
                                                className: 'w-full rounded-lg border-gray-300 text-sm'
                                            },
                                                React.createElement('option', { value: '' }, t('assignCaddy')),
                                                caddies.filter(c => c.status === 'available').map(caddy =>
                                                    React.createElement('option', { key: caddy.id, value: caddy.id },
                                                        `#${caddy.number} ${caddy.name}`
                                                    )
                                                )
                                            )
                                        ),
                                        // Remove button
                                        golfers.length > 1 && React.createElement('button', {
                                            onClick: () => removeGolfer(index),
                                            className: 'text-red-500 hover:text-red-700'
                                        },
                                            React.createElement('span', { className: 'material-symbols-outlined' }, 'delete')
                                        )
                                    );
                                })
                            )
                        ),
                        // Notes
                        React.createElement('div', null,
                            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, t('notes')),
                            React.createElement('textarea', {
                                value: notes,
                                onChange: (e) => setNotes(e.target.value),
                                rows: 3,
                                className: 'w-full rounded-lg border-gray-300 text-sm'
                            })
                        )
                    ),
                    // Modal Footer
                    React.createElement('div', { className: 'bg-gray-50 px-6 py-4 rounded-b-xl flex justify-end gap-3' },
                        React.createElement('button', {
                            onClick: onClose,
                            className: 'px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50'
                        }, t('cancel')),
                        React.createElement('button', {
                            onClick: handleSave,
                            className: 'px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700'
                        }, t('save'))
                    )
                )
            );
        }

        // Render the component
        const root = ReactDOM.createRoot(container);
        root.render(React.createElement(ProShopTeeSheet));
    }

    // ============= INITIALIZATION =============
    function init() {
        const container = document.getElementById('proshop-teesheet-root');
        if (!container) {
            console.log('[TeeSheet] Container not found, will retry...');
            setTimeout(init, 1000);
            return;
        }

        console.log('[TeeSheet] Initializing Pro Shop Tee Sheet...');
        loadReactDependencies(() => {
            renderTeeSheet(container);
            console.log('[TeeSheet] Tee Sheet rendered successfully');
        });
    }

    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Add a small delay to ensure other scripts are loaded
        setTimeout(init, 500);
    }

    // Expose bridge for external access
    window.ProShopTeeSheet = {
        MciProBridge,
        refresh: init,
        COURSE_CONFIG
    };

})();
