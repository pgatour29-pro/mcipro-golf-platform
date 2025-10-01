import React, { useState, useEffect } from 'react';
import { Search, Calendar, Users, MapPin, Star, Award, Clock, TrendingUp, Settings, Bell, User, Menu, ChevronRight, Play, Plus, Heart, Share2, Filter, Grid, List } from 'lucide-react';

const GolfPlatform = () => {
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for golf courses
  const golfCourses = [
    {
      id: 1,
      name: "Augusta National Golf Club",
      location: "Augusta, GA",
      rating: 4.9,
      difficulty: "Championship",
      price: "$500-800",
      image: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&h=400&fit=crop",
      features: ["18 Holes", "Masters Tournament", "Private"],
      availability: "Limited"
    },
    {
      id: 2,
      name: "Pebble Beach Golf Links",
      location: "Pebble Beach, CA",
      rating: 4.8,
      difficulty: "Professional",
      price: "$400-600",
      image: "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=800&h=400&fit=crop",
      features: ["Ocean Views", "18 Holes", "Public"],
      availability: "Available"
    },
    {
      id: 3,
      name: "St. Andrews Links",
      location: "St. Andrews, Scotland",
      rating: 4.7,
      difficulty: "Historic",
      price: "$200-400",
      image: "https://images.unsplash.com/photo-1566491059785-d5e4c0b89d5b?w=800&h=400&fit=crop",
      features: ["Historic", "Links Style", "Public"],
      availability: "Booking Required"
    }
  ];

  const caddies = [
    { id: 1, name: "Marcus Johnson", rating: 4.9, experience: "15 years", speciality: "Championship Courses", price: "$150/round" },
    { id: 2, name: "Sarah Chen", rating: 4.8, experience: "12 years", speciality: "Course Strategy", price: "$130/round" },
    { id: 3, name: "David Rodriguez", rating: 4.7, experience: "10 years", speciality: "Equipment Expert", price: "$120/round" }
  ];

  const upcomingEvents = [
    { id: 1, name: "Corporate Championship", date: "Oct 15, 2025", course: "Augusta National", participants: 64 },
    { id: 2, name: "Charity Pro-Am", date: "Oct 22, 2025", course: "Pebble Beach", participants: 128 },
    { id: 3, name: "Member's Tournament", date: "Nov 5, 2025", course: "St. Andrews", participants: 96 }
  ];

  const BackgroundOverlay = ({ children, blur = true, opacity = 'light' }) => {
    const opacityClasses = {
      light: 'from-emerald-900/20 via-slate-900/30 to-emerald-950/25',
      medium: 'from-emerald-900/40 via-slate-900/50 to-emerald-950/45', 
      heavy: 'from-emerald-900/60 via-slate-900/70 to-emerald-950/65'
    };
    
    return (
      <div className="relative">
        <div className={`absolute inset-0 bg-gradient-to-br ${opacityClasses[opacity]} ${blur ? 'backdrop-blur-lg' : ''}`} />
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  };

  const CourseCard = ({ course, featured = false }) => (
    <div 
      className={`group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-500 ${
        featured ? 'col-span-2 row-span-2 h-96' : 'h-64'
      } hover:scale-105 hover:shadow-2xl`}
      onClick={() => setSelectedCourse(course)}
    >
      <img 
        src={course.image} 
        alt={course.name}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute inset-0 p-6 flex flex-col justify-end">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <Star className="w-4 h-4 fill-current" />
            <span>{course.rating}</span>
            <span className="text-white/70">•</span>
            <span className="text-white/70">{course.difficulty}</span>
          </div>
          <h3 className={`font-bold text-white ${featured ? 'text-3xl' : 'text-xl'}`}>
            {course.name}
          </h3>
          <div className="flex items-center gap-2 text-white/80">
            <MapPin className="w-4 h-4" />
            <span>{course.location}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-semibold">{course.price}</span>
            <div className="flex gap-2">
              <button className="p-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 hover:bg-white/25 transition-colors">
                <Heart className="w-4 h-4 text-white" />
              </button>
              <button className="p-2 rounded-full bg-white/15 backdrop-blur-md border border-white/20 hover:bg-white/25 transition-colors">
                <Share2 className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const CaddieCard = ({ caddie }) => (
    <div className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-105">
      <div className="h-48 bg-gradient-to-br from-emerald-900 to-slate-900" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <Star className="w-4 h-4 fill-current" />
            <span>{caddie.rating}</span>
            <span className="text-white/70">•</span>
            <span className="text-white/70">{caddie.experience}</span>
          </div>
          <h3 className="font-bold text-white text-lg">{caddie.name}</h3>
          <p className="text-white/80 text-sm">{caddie.speciality}</p>
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-semibold">{caddie.price}</span>
            <button className="px-3 py-1 bg-emerald-600/80 backdrop-blur-md border border-emerald-500/30 hover:bg-emerald-500/80 rounded-lg text-white text-sm transition-colors">
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const EventCard = ({ event }) => (
    <div className="group relative overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-105">
      <div className="h-32 bg-gradient-to-r from-emerald-900 to-blue-900" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <div className="absolute inset-0 p-4 flex flex-col justify-between">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-3 space-y-1">
          <h3 className="font-bold text-white">{event.name}</h3>
          <p className="text-white/80 text-sm">{event.course}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg p-3 flex items-center justify-between">
          <div className="text-white/70 text-sm">
            <div>{event.date}</div>
            <div>{event.participants} participants</div>
          </div>
          <button className="px-3 py-1 bg-emerald-600/80 backdrop-blur-md border border-emerald-500/30 hover:bg-emerald-500/80 rounded-lg text-white text-sm transition-colors">
            Join
          </button>
        </div>
      </div>
    </div>
  );

  const NavigationTabs = () => (
    <div className="flex items-center gap-8 mb-8">
      {[
        { id: 'discover', label: 'Discover', icon: Search },
        { id: 'courses', label: 'Courses', icon: MapPin },
        { id: 'caddies', label: 'Caddies', icon: Users },
        { id: 'events', label: 'Events', icon: Calendar },
        { id: 'my-golf', label: 'My Golf', icon: User }
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 backdrop-blur-xl border ${
            activeTab === id 
              ? 'bg-emerald-600/60 border-emerald-500/50 text-white shadow-lg shadow-emerald-600/25' 
              : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20'
          }`}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Header */}
      <header className="relative">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-2xl border-b border-white/10" />
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Award className="w-8 h-8 text-emerald-400" />
                <h1 className="text-2xl font-bold text-white">GolfPro Enterprise</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search courses, caddies, events..."
                  className="pl-10 pr-4 py-2 bg-white/5 backdrop-blur-xl border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50 w-80"
                />
              </div>
              <button className="p-2 rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-colors">
                <Bell className="w-5 h-5 text-white" />
              </button>
              <button className="p-2 rounded-lg bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-colors">
                <Settings className="w-5 h-5 text-white" />
              </button>
              <div className="w-8 h-8 rounded-full bg-emerald-600/80 backdrop-blur-md border border-emerald-500/30 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <NavigationTabs />

        {activeTab === 'discover' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <BackgroundOverlay>
              <section className="relative h-96 rounded-2xl overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200&h=400&fit=crop"
                  alt="Featured Course"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 p-12 flex flex-col justify-center">
                  <div className="max-w-2xl space-y-4">
                    <h2 className="text-5xl font-bold text-white">Experience World-Class Golf</h2>
                    <p className="text-xl text-white/80">Connect with premium courses, expert caddies, and exclusive events worldwide</p>
                    <div className="flex gap-4">
                      <button className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-semibold transition-colors flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        Start Exploring
                      </button>
                      <button className="px-8 py-3 bg-white/20 hover:bg-white/30 rounded-lg text-white font-semibold transition-colors">
                        Learn More
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </BackgroundOverlay>

            {/* Featured Courses Grid */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Featured Courses</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-emerald-600' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    <Grid className="w-4 h-4 text-white" />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-emerald-600' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    <List className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {golfCourses.map((course, index) => (
                  <CourseCard key={course.id} course={course} featured={index === 0} />
                ))}
              </div>
            </section>

            {/* Top Caddies */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Top Rated Caddies</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {caddies.map(caddie => (
                  <CaddieCard key={caddie.id} caddie={caddie} />
                ))}
              </div>
            </section>

            {/* Upcoming Events */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Upcoming Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map(event => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Other tabs content would be similar with appropriate data */}
        {activeTab === 'courses' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {golfCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}

        {activeTab === 'caddies' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {caddies.map(caddie => (
              <CaddieCard key={caddie.id} caddie={caddie} />
            ))}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {activeTab === 'my-golf' && (
          <BackgroundOverlay>
            <div className="p-8 rounded-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">My Golf Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 bg-white/10 rounded-xl">
                  <h3 className="text-lg font-semibold text-white mb-2">Rounds Played</h3>
                  <p className="text-3xl font-bold text-emerald-400">42</p>
                  <p className="text-white/70 text-sm">This year</p>
                </div>
                <div className="p-6 bg-white/10 rounded-xl">
                  <h3 className="text-lg font-semibold text-white mb-2">Average Score</h3>
                  <p className="text-3xl font-bold text-emerald-400">78</p>
                  <p className="text-white/70 text-sm">Last 10 rounds</p>
                </div>
                <div className="p-6 bg-white/10 rounded-xl">
                  <h3 className="text-lg font-semibold text-white mb-2">Handicap</h3>
                  <p className="text-3xl font-bold text-emerald-400">12.4</p>
                  <p className="text-white/70 text-sm">USGA Index</p>
                </div>
                <div className="p-6 bg-white/10 rounded-xl">
                  <h3 className="text-lg font-semibold text-white mb-2">Courses Played</h3>
                  <p className="text-3xl font-bold text-emerald-400">18</p>
                  <p className="text-white/70 text-sm">Unique venues</p>
                </div>
              </div>
            </div>
          </BackgroundOverlay>
        )}
      </main>

      {/* Course Details Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <BackgroundOverlay>
            <div className="bg-slate-900/95 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="relative h-64">
                <img 
                  src={selectedCourse.image} 
                  alt={selectedCourse.name}
                  className="w-full h-full object-cover rounded-t-2xl"
                />
                <button 
                  onClick={() => setSelectedCourse(null)}
                  className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{selectedCourse.name}</h2>
                  <div className="flex items-center gap-4 text-white/70">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {selectedCourse.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-emerald-400 fill-current" />
                      {selectedCourse.rating}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">Course Features</h3>
                    <div className="space-y-2">
                      {selectedCourse.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-white/80">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">Booking Information</h3>
                    <div className="space-y-2 text-white/80">
                      <p>Price Range: <span className="text-emerald-400">{selectedCourse.price}</span></p>
                      <p>Availability: <span className="text-emerald-400">{selectedCourse.availability}</span></p>
                      <p>Difficulty: <span className="text-emerald-400">{selectedCourse.difficulty}</span></p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-semibold transition-colors">
                    Book Tee Time
                  </button>
                  <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-white font-semibold transition-colors">
                    Add to Favorites
                  </button>
                </div>
              </div>
            </div>
          </BackgroundOverlay>
        </div>
      )}
    </div>
  );
};

export default GolfPlatform;