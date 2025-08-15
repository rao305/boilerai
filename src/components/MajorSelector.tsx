import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getAvailableMajors, getMajorRequirements } from "@/data/majorRequirements";

interface MajorSelectorProps {
  selectedMajor: string;
  onMajorChange: (major: string) => void;
  className?: string;
}

export function MajorSelector({ selectedMajor, onMajorChange, className }: MajorSelectorProps) {
  const availableMajors = getAvailableMajors();
  
  const getMajorInfo = (major: string) => {
    const requirements = getMajorRequirements(major);
    if (!requirements) return null;
    
    const totalCourses = requirements.requirements.reduce((sum, req) => sum + req.total, 0);
    const totalCredits = requirements.requirements.reduce((sum, req) => sum + req.creditHours.total, 0);
    
    return { totalCourses, totalCredits };
  };

  return (
    <div className={className}>
      <label htmlFor="major-select" className="block text-sm font-medium text-foreground mb-2">
        Select Major
      </label>
      <Select value={selectedMajor} onValueChange={onMajorChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a major" />
        </SelectTrigger>
        <SelectContent>
          {availableMajors.map((major) => {
            const info = getMajorInfo(major);
            return (
              <SelectItem key={major} value={major} className="flex flex-col items-start">
                <div className="w-full">
                  <div className="font-medium">{major}</div>
                  {info && (
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {info.totalCourses} courses
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {info.totalCredits} credits
                      </Badge>
                    </div>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {selectedMajor && getMajorInfo(selectedMajor) && (
        <div className="mt-2 text-sm text-muted-foreground">
          Selected: {selectedMajor} • {getMajorInfo(selectedMajor)?.totalCredits} total credits required
        </div>
      )}
    </div>
  );
}