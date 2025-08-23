import unittest
import json
from planner.core import compute_plan
from api_gateway.db import db_query

class TestSETrack(unittest.TestCase):
    """Test Software Engineering track with pair rules"""
    
    def test_se_track_courses_exist(self):
        """Verify all SE track courses exist in database"""
        se_courses = [
            "CS30700", "CS35200", "CS35400", "CS38100", "CS40800", "CS40700",
            "CS34800", "CS35100", "CS35300", "CS37300", "CS42200", "CS42600",
            "CS44800", "CS45600", "CS47100", "CS47300", "CS48900",
            "CS49000-DSO", "CS49000-SWS", "CS51000", "CS59000-SRS",
            "EPCS41100", "EPCS41200", "CS31100", "CS41100"
        ]
        
        for course_id in se_courses:
            course = db_query("SELECT id FROM courses WHERE id = %s", [course_id])
            self.assertTrue(len(course) > 0, f"Course {course_id} not found in database")
    
    def test_se_track_pair_rules_exist(self):
        """Verify pair_rules are present for SE track groups"""
        groups = db_query("""
            SELECT key, pair_rules FROM track_groups 
            WHERE track_id = 'software_engineering'
        """, [])
        
        group_dict = {g['key']: g['pair_rules'] for g in groups}
        
        # Check se_electives has CS31100+CS41100 pair rule
        self.assertIn('se_electives', group_dict)
        electives_pairs = group_dict['se_electives']
        self.assertIn(["CS31100", "CS41100"], electives_pairs)
        
        # Check se_req_capstone has EPCS pair rule
        self.assertIn('se_req_capstone', group_dict)
        capstone_pairs = group_dict['se_req_capstone']
        self.assertIn(["EPCS41100", "EPCS41200"], capstone_pairs)
    
    def test_epics_pair_satisfies_capstone(self):
        """Test EPCS41100+EPCS41200 satisfies SE capstone requirement"""
        profile = {
            "student": {"gpa": 3.5, "start_term": "F2025"},
            "major": "CS",
            "track_id": "software_engineering",
            "completed": [
                {"course_id": "CS30700", "grade": "A", "term": "F2024"},
                {"course_id": "CS38100", "grade": "B", "term": "F2024"},
                {"course_id": "CS40800", "grade": "B", "term": "S2025"},
                {"course_id": "CS35200", "grade": "A", "term": "S2025"},
                {"course_id": "EPCS41100", "grade": "A", "term": "F2025"},
                {"course_id": "EPCS41200", "grade": "A", "term": "S2026"}
            ]
        }
        
        result = compute_plan(profile)
        
        # Check if se_req_capstone is satisfied
        unmet_groups = {g['key']: g for g in result['unmet_track_groups']}
        self.assertNotIn('se_req_capstone', unmet_groups, "EPICS pair should satisfy capstone requirement")
        
        # Check rationales mention the pair rule
        rationales = result['rationales']
        pair_rationale_found = any("EPCS41100+EPCS41200" in r for r in rationales)
        self.assertTrue(pair_rationale_found, "Should include rationale about EPICS pair rule")
    
    def test_cs31100_cs41100_pair_satisfies_elective(self):
        """Test CS31100+CS41100 counts as one SE elective"""
        profile = {
            "student": {"gpa": 3.5, "start_term": "F2025"},
            "major": "CS", 
            "track_id": "software_engineering",
            "completed": [
                {"course_id": "CS31100", "grade": "A", "term": "F2024"},
                {"course_id": "CS41100", "grade": "B", "term": "S2025"}
            ]
        }
        
        result = compute_plan(profile)
        
        # Check if se_electives shows 1 satisfied
        unmet_groups = {g['key']: g for g in result['unmet_track_groups']}
        if 'se_electives' in unmet_groups:
            # Should show 0 missing since pair counts as 1
            self.assertEqual(unmet_groups['se_electives']['missing'], 0)
        
        # Check rationales mention the pair rule
        rationales = result['rationales']
        pair_rationale_found = any("CS31100+CS41100" in r for r in rationales)
        self.assertTrue(pair_rationale_found, "Should include rationale about competitive programming pair rule")

if __name__ == '__main__':
    unittest.main()