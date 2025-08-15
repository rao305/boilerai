import React from "react";
import { Star, Clock, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CourseCardProps {
  course: {
    id: string;
    code: string;
    title: string;
    credits: number;
    description: string;
    instructor: string;
    rating: number;
    enrollment: number;
    capacity: number;
    schedule: string;
    prerequisites?: string[];
    semester: string;
    department: string;
  };
  onAddToPlan?: (courseId: string) => void;
  className?: string;
}

export function CourseCard({ course, onAddToPlan, className }: CourseCardProps) {
  const enrollmentPercentage = course.capacity > 0 ? (course.enrollment / course.capacity) * 100 : 0;
  
  return (
    <div className={cn(
      "rounded-lg border border-border bg-card p-6 transition-refined hover-lift",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-foreground">{course.code}</h3>
            <Badge variant="secondary">
              <span>{course.credits} credits</span>
            </Badge>
          </div>
          <h4 className="mt-1 text-base font-medium text-foreground">{course.title}</h4>
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{course.description}</p>
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{course.rating}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{course.enrollment}/{course.capacity}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{course.schedule}</span>
              </div>
            </div>
            
            <div className="text-sm">
              <span className="text-muted-foreground">Instructor: </span>
              <span className="font-medium text-foreground">{course.instructor}</span>
            </div>
            
            {course.prerequisites && course.prerequisites.length > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Prerequisites: </span>
                <span className="text-foreground">{course.prerequisites.join(", ")}</span>
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Enrollment</span>
              <span>{enrollmentPercentage.toFixed(0)}% full</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  enrollmentPercentage > 90 ? "bg-red-500" :
                  enrollmentPercentage > 70 ? "bg-yellow-500" : "bg-green-500"
                )}
                style={{ width: `${enrollmentPercentage}%` }}
              />
            </div>
          </div>
        </div>
        
        {onAddToPlan && (
          <div className="ml-4">
            <Button 
              onClick={() => onAddToPlan(course.id)}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              Add to Plan
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}