'use client'

import React, { useState } from 'react'
import { BookOpen, Users, Calendar, Search, Filter, X, BarChart2 } from 'lucide-react'
import KitKatStudentTable from '@/components/components-kit-kat-student-table'
import AttendanceDashboard from '@/components/attendance-dashboard'
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import AnalyticsDashboard from '@/components/AnalyticsDashboard'

const NavLink = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
  <Button
    variant="ghost"
    className={cn(
      "h-full px-4 py-2 hover:text-primary",
      active ? "text-foreground font-medium" : "text-muted-foreground"
    )}
    onClick={onClick}
  >
    {children}
  </Button>
)

export default function NavLayout() {
  const [activeView, setActiveView] = useState('progress')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterConfig, setFilterConfig] = useState({
    minKitKatPoints: 0,
    minStreak: 0,
    minXP: 0
  })
  
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center justify-between px-4 max-w-screen-2xl mx-auto">
            {/* Left section with logo and navigation */}
            <div className="flex items-center space-x-8">
              {/* User Profile */}
              <div className="flex items-center space-x-4 min-w-[200px]">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/placeholder-avatar.jpg" alt="User avatar" />
                  <AvatarFallback>AK</AvatarFallback>
                </Avatar>
                <span className="font-medium">Ankish Khatri</span>
              </div>

              {/* Navigation Links */}
              <div className="flex items-center space-x-1">
                <NavLink
                  active={activeView === 'progress'}
                  onClick={() => setActiveView('progress')}
                >
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" aria-hidden="true" />
                    Progress Tracking
                  </div>
                </NavLink>
                <NavLink
                  active={activeView === 'attendance'}
                  onClick={() => setActiveView('attendance')}
                >
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" aria-hidden="true" />
                    Attendance
                  </div>
                </NavLink>
                <NavLink
                  active={activeView === 'analytics'}
                  onClick={() => setActiveView('analytics')}
                >
                  <div className="flex items-center">
                    <BarChart2 className="w-4 h-4 mr-2" aria-hidden="true" />
                    Analytics
                  </div>
                </NavLink>
              </div>
            </div>

            {/* Right section with search and filters */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  className="w-[300px] pl-9 pr-4" 
                  placeholder="Search students..." 
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <h3 className="font-medium">Filters</h3>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Min Kit Kat Points</label>
                      <Slider
                        min={0}
                        max={20}
                        step={1}
                        value={[filterConfig.minKitKatPoints]}
                        onValueChange={(value) => setFilterConfig(prev => ({ ...prev, minKitKatPoints: value[0] }))}
                      />
                      <div className="text-sm text-muted-foreground">{filterConfig.minKitKatPoints}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Min Streak</label>
                      <Slider
                        min={0}
                        max={30}
                        step={1}
                        value={[filterConfig.minStreak]}
                        onValueChange={(value) => setFilterConfig(prev => ({ ...prev, minStreak: value[0] }))}
                      />
                      <div className="text-sm text-muted-foreground">{filterConfig.minStreak}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Min XP</label>
                      <Slider
                        min={0}
                        max={1000}
                        step={50}
                        value={[filterConfig.minXP]}
                        onValueChange={(value) => setFilterConfig(prev => ({ ...prev, minXP: value[0] }))}
                      />
                      <div className="text-sm text-muted-foreground">{filterConfig.minXP}</div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 py-6">
        {activeView === 'progress' && (
          <KitKatStudentTable 
            searchTerm={searchTerm} 
            filterConfig={filterConfig}
          />
        )}
        {activeView === 'attendance' && <AttendanceDashboard />}
        {activeView === 'analytics' && <AnalyticsDashboard />} 
      </main>
    </div>
  )
}