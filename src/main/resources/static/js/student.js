// student.js - Handles Student Dashboard & Course Viewer logic
const API_BASE = 'http://localhost:8081/api';
let currentStudentId = localStorage.getItem('userId');

let allCourses = [];
let enrolledCourses = [];
let completedCourses = [];

let selectedCourseId = null;

// Tab Navigation
async function showTab(tabId, title) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById('homeView').style.display = 'none';
    
    const target = document.getElementById(tabId);
    target.style.display = 'block';

    // Show subview topbar
    document.getElementById('mainTopbar').style.display = 'none';
    const subTop = document.getElementById('subViewTopbar');
    subTop.style.display = 'flex';
    document.getElementById('subViewTitle').textContent = title;

    if (tabId === 'all-courses') {
        document.getElementById('allCoursesList').innerHTML = 'Loading...';
        await loadAllCourses();
        renderAllCourses(allCourses);
    } else if (tabId === 'enrolled-courses') {
        document.getElementById('enrolledCoursesList').innerHTML = 'Loading...';
        await loadEnrolledCourses();
        renderEnrolledCourses();
    } else if (tabId === 'completed-courses') {
        document.getElementById('completedCoursesList').innerHTML = 'Loading...';
        await loadEnrolledCourses(); // same endpoint helps filter completed
        renderCompletedCourses();
    }
}

function showHome() {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById('subViewTopbar').style.display = 'none';
    
    document.getElementById('mainTopbar').style.display = 'flex';
    document.getElementById('homeView').style.display = 'block';
}

async function loadAllCourses() {
    try {
        const res = await fetch(`${API_BASE}/courses`);
        allCourses = await res.json();
    } catch(e) {
        console.error("Failed to load courses");
    }
}

async function loadEnrolledCourses() {
    if (!currentStudentId) return;
    try {
        const res = await fetch(`${API_BASE}/enrollments/student/${currentStudentId}`);
        const data = await res.json();
        
        enrolledCourses = data.filter(e => e.status !== 'COMPLETED');
        completedCourses = data.filter(e => e.status === 'COMPLETED');
    } catch(e) {
        console.error("Failed to load enrollments");
    }
}

function renderAllCourses(courseList) {
    const container = document.getElementById('allCoursesList');
    container.innerHTML = '';
    
    let sortedList = [...courseList].sort((a,b) => a.name.localeCompare(b.name));

    if (sortedList.length === 0) {
        container.innerHTML = '<p class="empty-state">No courses found.</p>';
        return;
    }

    sortedList.forEach(c => {
        const div = document.createElement('div');
        div.className = 'course-item';
        div.style.cursor = 'pointer';
        div.onclick = () => openCourseModal(c.id);
        
        div.innerHTML = `
            <div class="course-header">
                <div class="icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M8 7v4"/><path d="M12 7v4"/><path d="M16 7v4"/></svg>
                </div>
            </div>
            <h3 style="font-size:18px; margin-bottom:10px;">${c.name}</h3>
            <p style="color:var(--text-muted); font-size:15px; margin-bottom:15px; line-height:1.4;">${c.description||''}</p>
            <div class="course-details-row">
                <span style="display:flex; align-items:center; gap:5px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ${c.durationMins||0}h
                </span>
                <span>
                    ${c.sections ? c.sections.length : 0} sections
                </span>
            </div>
        `;
        container.appendChild(div);
    });
}

function searchCourses(e) {
    const term = e.target.value.toLowerCase();
    const filtered = allCourses.filter(c => c.name.toLowerCase().includes(term) || (c.description||'').toLowerCase().includes(term));
    renderAllCourses(filtered);
}

function openCourseModal(id) {
    const course = allCourses.find(c => c.id === id);
    if (!course) return;
    
    selectedCourseId = id;
    
    document.getElementById('cdTitle').textContent = course.name;
    document.getElementById('cdDesc').textContent = course.description || '';
    document.getElementById('cdTime').innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-6px; margin-right:5px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${course.durationMins || 0}h`;
    document.getElementById('cdSecs').textContent = `${course.sections ? course.sections.length : 0} sections`;
    
    const secList = document.getElementById('cdSectionsList');
    secList.innerHTML = '';
    if (course.sections && course.sections.length > 0) {
        course.sections.sort((a,b) => a.orderIndex - b.orderIndex).forEach((sec, idx) => {
            const d = document.createElement('div');
            d.style = "background:white; border:1px solid #CBD5E0; border-radius:12px; padding:15px 25px; margin-bottom:15px; display:flex; justify-content:space-between; font-weight:500; font-size:16px; align-items:center;";
            d.innerHTML = `<span>${idx+1}. ${sec.name}</span><span style="color:#718096; font-weight:400; font-size:15px;">${sec.pptUrl || 'PPT'}</span>`;
            secList.appendChild(d);
        });
    } else {
         secList.innerHTML = '<p class="empty-state">No sections mapped yet.</p>';
    }
    
    showTab('course-details-view', 'Course Details');
}

async function enrollCourse() {
    if (!currentStudentId) {
        alert("Please login first.");
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/enrollments`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({studentId: currentStudentId, courseId: selectedCourseId})
        });
        
        if (res.ok) {
            const enrollData = await res.json();
            alert("Enrolled successfully!");
            window.location.href = `course-viewer.html?courseId=${selectedCourseId}&enrollmentId=${enrollData.id}`;
        } else {
            const err = await res.text();
            alert("Enrollment failed: " + err);
        }
    } catch(e) {
        alert("Network error");
    }
    
    document.getElementById('courseModal').style.display = 'none';
}

function renderEnrolledCourses() {
    const container = document.getElementById('enrolledCoursesList');
    container.innerHTML = '';
    
    if (enrolledCourses.length === 0) {
        container.innerHTML = '<p class="empty-state">No enrolled courses.</p>';
        return;
    }

    enrolledCourses.forEach(en => {
        const c = en.course;
        const div = document.createElement('div');
        div.className = 'course-item';
        div.style.cursor = 'pointer';
        div.onclick = () => { window.location.href = `course-viewer.html?courseId=${c.id}&enrollmentId=${en.id}`; };
        
        div.innerHTML = `
            <div class="course-header">
                <div class="icon" style="background:#C6F6D5; color:#2F855A;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                </div>
            </div>
            <h3 style="font-size:18px; margin-bottom:10px;">${c.name}</h3>
            
            <div class="course-details-row">
                <span style="display:flex; align-items:center; gap:5px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    ${c.durationMins||0}h
                </span>
                <span>
                    ${c.sections ? c.sections.length : 0} sections
                </span>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderCompletedCourses() {
    const container = document.getElementById('completedCoursesList');
    container.innerHTML = '';
    
    if (completedCourses.length === 0) {
        container.innerHTML = '<p class="empty-state">No completed courses yet.</p>';
        return;
    }

    completedCourses.forEach(en => {
        const c = en.course;
        const div = document.createElement('div');
        div.className = 'course-item';
        div.style.cursor = 'pointer';
        div.onclick = () => { window.location.href = `course-viewer.html?courseId=${c.id}&enrollmentId=${en.id}`; };
        let compDateStr = en.completedAt ? new Date(en.completedAt).toLocaleDateString() : '';
        div.innerHTML = `
            <div class="course-header">
                <div class="icon" style="background:#C6F6D5; color:#000;">
                    <!-- Badge Award icon -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15l-2 5l9-3.5L22 20l-2-5"/><circle cx="12" cy="8" r="5"/><path d="M9 13.5l-3 4.5l-1-6L2 7l6-1"/></svg>
                </div>
            </div>
            <h3 style="font-size:18px; margin-bottom:10px;">${c.name}</h3>
            <p style="color:var(--text-muted); font-size:15px; margin-bottom:15px; line-height:1.4;">${c.description||''}</p>
            
            <div class="course-details-row">
                <span class="completed-badge">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Completed
                </span>
                <span>Date: ${compDateStr}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const uName = localStorage.getItem('userName');
    if(uName) {
        document.getElementById('welcomeUserText').textContent = 'Welcome, ' + uName;
    }
});
