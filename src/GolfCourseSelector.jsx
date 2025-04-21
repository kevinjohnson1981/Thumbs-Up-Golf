import React, { useState } from "react";

function GolfCourseSelector({ setSelectedCourse, setSelectedTee, selectedCourse }) {
  const [courseName, setCourseName] = useState("");
  const [courses, setCourses] = useState([]);
  const API_KEY = "B5JFG4KI6LA3MYOKEGJM6QRHXE"; // Your secret key from StackBlitz env

  const fetchCourses = async () => {
    const url = `https://api.golfcourseapi.com/v1/search?search_query=${courseName}`;
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Key ${API_KEY}`,
        },
      });
      const data = await response.json();
      setCourses(data.courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchCourseDetails = async (courseId) => {
    const url = `https://api.golfcourseapi.com/v1/courses/${courseId}`;
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Key ${API_KEY}`,
        },
      });
      const data = await response.json();
      setSelectedCourse(data.course);
    } catch (error) {
      console.error("Error fetching course details:", error);
    }
  };

  return (
    <div>
      <h2>Find Your Golf Course</h2>
      <input
        type="text"
        className="course-input"
        value={courseName}
        onChange={(e) => setCourseName(e.target.value)}
        placeholder="Enter course name"
      />
      <button onClick={fetchCourses}>Search</button>
      {courses.length > 0 && (
        <ul>
          {courses.map((course) => (
            <li key={course.id}>
              {course.course_name} - {course.location.city}, {course.location.state}
              <button onClick={() => fetchCourseDetails(course.id)}>Select</button>
            </li>
          ))}
        </ul>
      )}
      {selectedCourse && (
        <>
          <h3>{selectedCourse.course_name}</h3>
          <p>Location: {selectedCourse.location.city}, {selectedCourse.location.state}</p>
          <div className="form-row">
          <label>Select Tee Box:</label>
          <select onChange={(e) => setSelectedTee(e.target.value)}>
            <option value="">-- Choose Tee --</option>
            {Object.values(selectedCourse.tees).flat().map((tee, idx) => (
              <option key={idx} value={tee.tee_name}>
                {tee.tee_name} (Yardage: {tee.total_yards})
              </option>
            ))}
          </select>
          </div>
        </>
      )}
    </div>
  );
}

export default GolfCourseSelector;
