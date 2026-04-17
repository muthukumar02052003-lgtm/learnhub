// admin.js - Handles Admin Dashboard logic matching the new UI designs (Images 16-25)

// Determine API base URL dynamically
const API_BASE = window.location.port === '5500' 
    ? 'http://localhost:8081/api'  // Local development with Live Server
    : '/api';  // Production (same server)

let courses = [];
let pendingSections = [{id: 1}];
let pendingQuestions = [{id: 1}];
let currentViewingCourseId = null;
let currentAdminId = localStorage.getItem('userId');

let studentProgress = [];
let editingCourseId = null;

// Tab Navigation
async function showTab(tabId, title) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById('homeView').style.display = 'none';
    
    document.getElementById('mainTopbar').style.display = 'none';
    document.getElementById('subViewTopbar').style.display = 'flex';
    document.getElementById('subViewTitle').textContent = title;
    document.getElementById('subViewActions').style.display = 'none';

    if (tabId === 'course-list') {
        document.getElementById('courseListTableContainer').innerHTML = 'Loading...';
        await loadCourses();
        renderCourseList(courses);
    } else if (tabId === 'student-progress') {
        document.getElementById('studentTableBody').innerHTML = 'Loading...';
        await loadStudentProgress();
        renderStudentProgress();
    } else if (tabId === 'add-course') {
        if (title !== 'Edit Course') {
            editingCourseId = null;
            pendingSections = [{id: 1}];
            pendingQuestions = [{id: 1}];
            document.getElementById('courseName').value = '';
            document.getElementById('courseDesc').value = '';
            document.getElementById('courseDuration').value = '';
        }
        renderSectionsForm();
        renderQuestionsForm();
    }

    document.getElementById(tabId).style.display = 'block';
}

function showHome() {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById('subViewTopbar').style.display = 'none';
    
    document.getElementById('mainTopbar').style.display = 'flex';
    document.getElementById('homeView').style.display = 'block';
}

function showNotification(message, type = 'success') {
    const notif = document.getElementById('notification');
    notif.textContent = message;
    notif.className = `notification show ${type}`;
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
}

/* === API Logic === */
async function loadCourses() {
    try {
        const res = await fetch(`${API_BASE}/courses`);
        courses = await res.json();
    } catch (err) {
        console.error("Error loading courses", err);
    }
}

async function loadStudentProgress() {
    try {
        const res = await fetch(`${API_BASE}/enrollments/all`);
        const enrollments = await res.json();
        
        studentProgress = enrollments.map(en => {
            let comp = en.status === 'COMPLETED' ? 100 : (en.status === 'IN_PROGRESS' ? 50 : 0);
            let cls = en.status === 'COMPLETED' ? 'badge-completed' : (en.status === 'IN_PROGRESS' ? 'badge-progress' : 'badge-enrolled');
            let sName = en.student ? (en.student.firstName + ' ' + (en.student.lastName||'')) : 'Unknown Student';
            return {
                id: en.id,
                name: sName,
                courseName: en.course.name,
                comp: comp,
                status: en.status === 'IN_PROGRESS' ? 'In Progress' : (en.status === 'COMPLETED' ? 'Completed' : 'Enrolled'),
                cls: cls,
                enrollment: en
            }
        });
    } catch (err) {
        console.error("Error loading enrollments", err);
    }
}

/* === Add Course Logic (Images 21 & 23) === */
function scrapeSectionsState() {
    let parsedSections = [];
    document.querySelectorAll('.secBoxWrapper').forEach((el, index) => {
        let sName = el.querySelector('.secNameUI').value || '';
        let sFileLabel = el.querySelector('.fileText').innerText;
        let sFile = sFileLabel === 'Choose PPT file' ? '' : sFileLabel;
        parsedSections.push({ id: pendingSections[index]?.id || index+1, name: sName, fileName: sFile, durationMins: 5 });
    });
    pendingSections = parsedSections;
}

function removeSectionUi(idx) {
    scrapeSectionsState();
    pendingSections.splice(idx, 1);
    renderSectionsForm();
}

function renderSectionsForm() {
    const cont = document.getElementById('sectionsContainer');
    cont.innerHTML = '';
    pendingSections.forEach((sec, idx) => {
        let div = document.createElement('div');
        div.className = 'grouped-box secBoxWrapper';
        div.innerHTML = `
            ${idx > 0 ? `<button class="btn-remove" onclick="removeSectionUi(${idx})">&times;</button>` : ''}
            <label class="form-label">Section ${idx+1}</label>
            <input type="text" class="form-input secNameUI" placeholder="Section title" value="${sec.name || ''}">
            <label class="form-label" style="margin-top:15px;">Upload PDF(optional)</label>
            <label class="custom-file-upload">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                <span class="fileText">${sec.fileName ? sec.fileName.substring(sec.fileName.lastIndexOf('/') + 1) : 'Choose PDF file'}</span>
                <input type="file" class="secPPTUI" accept=".pdf" onchange="this.previousElementSibling.innerText = this.files[0].name" data-existing-url="${sec.fileName || ''}">
            </label>
        `;
        cont.appendChild(div);
    });
}

function addSectionUi() {
    scrapeSectionsState();
    pendingSections.push({id: pendingSections.length ? Math.max(...pendingSections.map(s => s.id)) + 1 : 1});
    renderSectionsForm();
}

function scrapeQuestionsState() {
    let parsedQuestions = [];
    document.querySelectorAll('.qBoxWrapper').forEach((el, index) => {
        let qTitle = el.querySelector('.qTitleUI').value || '';
        let qGrp = el.querySelectorAll('input[type="radio"]');
        let correctGrp = 'A';
        qGrp.forEach(r => { if(r.checked) correctGrp = r.value; });

        let a = el.querySelector('.qOptA').value || '';
        let b = el.querySelector('.qOptB').value || '';
        let c = el.querySelector('.qOptC').value || '';
        let d = el.querySelector('.qOptD').value || '';

        parsedQuestions.push({ 
            id: pendingQuestions[index]?.id || index+1, 
            text: qTitle, a, b, c, d, correct: correctGrp 
        });
    });
    pendingQuestions = parsedQuestions;
}

function removeQuestionUi(idx) {
    scrapeQuestionsState();
    pendingQuestions.splice(idx, 1);
    renderQuestionsForm();
}

function renderQuestionsForm() {
    const cont = document.getElementById('questionsContainer');
    cont.innerHTML = '';
    pendingQuestions.forEach((q, idx) => {
        let div = document.createElement('div');
        div.className = 'grouped-box qBoxWrapper';
        div.innerHTML = `
            ${idx > 0 ? `<button class="btn-remove" onclick="removeQuestionUi(${idx})">&times;</button>` : ''}
            <label class="form-label">Question ${idx+1}</label>
            <input type="text" class="form-input qTitleUI" placeholder="Enter question ${idx+1}" value="${q.text || ''}">
            
            <div class="question-grid">
                <div class="option-wrap">
                    <input type="radio" name="q${q.id}ans" value="A" ${q.correct === 'A' ? 'checked' : (!q.correct && idx === 0 ? 'checked' : '')}>
                    <input type="text" class="form-input qOptA" placeholder="Option 1" style="margin:0;" value="${q.a || ''}">
                </div>
                <div class="option-wrap">
                    <input type="radio" name="q${q.id}ans" value="B" ${q.correct === 'B' ? 'checked' : ''}>
                    <input type="text" class="form-input qOptB" placeholder="Option 2" style="margin:0;" value="${q.b || ''}">
                </div>
                <div class="option-wrap">
                    <input type="radio" name="q${q.id}ans" value="C" ${q.correct === 'C' ? 'checked' : ''}>
                    <input type="text" class="form-input qOptC" placeholder="Option 3" style="margin:0;" value="${q.c || ''}">
                </div>
                <div class="option-wrap">
                    <input type="radio" name="q${q.id}ans" value="D" ${q.correct === 'D' ? 'checked' : ''}>
                    <input type="text" class="form-input qOptD" placeholder="Option 4" style="margin:0;" value="${q.d || ''}">
                </div>
            </div>
            <span class="form-hint" style="margin-top:10px;">Select the radio button next to the correct answer</span>
        `;
        cont.appendChild(div);
    });
}

function addQuestionUi() {
    scrapeQuestionsState();
    pendingQuestions.push({id: pendingQuestions.length ? Math.max(...pendingQuestions.map(q => q.id)) + 1 : 1});
    renderQuestionsForm();
}

async function saveCourseUi() {
    const name = document.getElementById('courseName').value;
    const desc = document.getElementById('courseDesc').value;
    const duration = document.getElementById('courseDuration').value;

    if (!name || !duration) {
        alert("Course Title and Duration are required.");
        return;
    }

    let parsedSections = [];
    const secBoxWrappers = document.querySelectorAll('.secBoxWrapper');
    for (let el of secBoxWrappers) {
        let sName = el.querySelector('.secNameUI').value || 'Untitled Section';
        let fileInput = el.querySelector('.secPPTUI');
        let fileUrl = fileInput.getAttribute('data-existing-url') || null;

        if (fileInput.files.length > 0) {
            let formData = new FormData();
            formData.append('file', fileInput.files[0]);
            try {
                let uploadRes = await fetch(`${API_BASE}/files/upload`, {
                    method: 'POST',
                    body: formData
                });
                if (uploadRes.ok) {
                    let data = await uploadRes.json();
                    fileUrl = `${window.location.origin}${data.url}`; // construct full url
                } else {
                    console.error("Upload failed");
                }
            } catch (err) {
                console.error("File upload network error:", err);
            }
        }

        if (!fileUrl) {
            let sFileLabel = el.querySelector('.fileText').innerText;
            fileUrl = (sFileLabel === 'Choose PPT file' || sFileLabel === 'Choose PDF file') ? 'Software Testing.pdf' : sFileLabel;
        }

        parsedSections.push({ name: sName, fileName: fileUrl, durationMins: 5 });
    }

    let parsedQuestions = [];
    document.querySelectorAll('.qBoxWrapper').forEach(el => {
        let qTitle = el.querySelector('.qTitleUI').value || 'Untitled Question';
        let qGrp = el.querySelectorAll('input[type="radio"]');
        let correctGrp = 'A';
        qGrp.forEach(r => { if(r.checked) correctGrp = r.value; });

        let a = el.querySelector('.qOptA').value || 'Option 1';
        let b = el.querySelector('.qOptB').value || 'Option 2';
        let c = el.querySelector('.qOptC').value || 'Option 3';
        let d = el.querySelector('.qOptD').value || 'Option 4';

        parsedQuestions.push({ text: qTitle, a, b, c, d, correct: correctGrp });
    });

    const newCourse = {
        name,
        desc,
        duration: parseInt(duration),
        createdBy: currentAdminId,
        sections: parsedSections,
        questions: parsedQuestions
    };
    
    try {
        let method = editingCourseId ? 'PUT' : 'POST';
        let url = editingCourseId ? `${API_BASE}/courses/${editingCourseId}` : `${API_BASE}/courses`;
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newCourse)
        });

        if (res.ok) {
            showNotification(editingCourseId ? "Course updated successfully" : "Course saved successfully");
            editingCourseId = null;
            showTab('course-list', 'Course List');
        } else {
            alert("Error saving course");
        }
    } catch (e) {
        console.error(e);
        alert("Network error");
    }
}

/* === Course List View (Image 24) === */
function renderCourseList(listData) {
    const container = document.getElementById('courseListTableContainer');
    const emptyState = document.getElementById('emptyCourseState');
    container.innerHTML = '';

    if (listData.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        
        listData.forEach(c => {
            const div = document.createElement('div');
            div.className = 'course-item';
            div.style.cursor = 'pointer';
            div.onclick = () => viewCourseDetails(c.id);
            
            div.innerHTML = `
                <div class="course-header" style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/><path d="M8 7v4"/><path d="M12 7v4"/><path d="M16 7v4"/></svg>
                    </div>
                    <div style="display:flex; gap: 5px;">
                        <button class="btn-outline" style="border:none; padding:5px; background:transparent;" onclick="event.stopPropagation(); editCourseAction('${c.id}')" title="Edit Course">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#4A5568"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn-outline" style="border:none; padding:5px; background:transparent;" onclick="event.stopPropagation(); currentViewingCourseId='${c.id}'; confirmDelete()" title="Delete Course">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" color="#E53E3E"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                </div>
                <h3 style="font-size:18px; margin-bottom:10px;">${c.name}</h3>
                <p style="color:var(--text-muted); font-size:15px; margin-bottom:15px; line-height:1.4;">${c.description || ''}</p>
                <div class="course-details-row">
                    <span style="display:flex; align-items:center; gap:5px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${c.durationMins || 0}h
                    </span>
                    <span>${c.sections ? c.sections.length : 0} sections</span>
                </div>
            `;
            container.appendChild(div);
        });
    }
}

function searchAdminCourses(e) {
    const val = e.target.value.toLowerCase();
    const filtered = courses.filter(c => c.name.toLowerCase().includes(val) || (c.description ? c.description.toLowerCase().includes(val) : false));
    renderCourseList(filtered);
}

/* === Course Details View (Image 22) === */
function viewCourseDetails(id) {
    const c = courses.find(cc => cc.id === id);
    if (!c) return;
    currentViewingCourseId = id;

    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById('course-details-view').style.display = 'block';

    document.getElementById('subViewTitle').textContent = c.name;
    document.getElementById('subViewActions').style.display = 'flex';
    document.getElementById('subViewActions').innerHTML = `
        <button class="btn-primary" style="background:#E53E3E; padding: 6px 15px; font-weight:600; display:flex; align-items:center; gap:5px; width:auto;" onclick="confirmDelete()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            Delete
        </button>
    `;

    document.getElementById('cdTitle').textContent = c.name;
    document.getElementById('cdDesc').textContent = c.description || '';
    document.getElementById('cdTime').innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-3px; margin-right:5px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${c.durationMins || 0}h`;
    document.getElementById('cdSecs').textContent = `${c.sections ? c.sections.length : 0} sections`;
    document.getElementById('cdAsses').textContent = `${c.questions ? c.questions.length : 0} assessments questions`;

    const secList = document.getElementById('cdSectionsList');
    secList.innerHTML = '';
    if (c.sections) {
        c.sections.forEach((sec, idx) => {
            const d = document.createElement('div');
            d.style = "background:white; border:1px solid #CBD5E0; border-radius:12px; padding:12px 20px; margin-bottom:10px; display:flex; justify-content:space-between; font-weight:500; font-size:15px;";
            d.innerHTML = `<span>${idx+1}. ${sec.name}</span><span style="color:#718096; font-weight:400;">${sec.pptUrl || 'PPT'}</span>`;
            secList.appendChild(d);
        });
    }

    const assesList = document.getElementById('cdAssessmentsList');
    assesList.innerHTML = '';
    
    // Bubble UI matching exact Image 22
    if (c.questions) {
        c.questions.forEach((q, idx) => {
            const d = document.createElement('div');
            d.className = 'grouped-box';
            
            let buildOptions = '';
            ['A','B','C','D'].forEach(k => {
                let label = q['option' + k] || '';
                let dotColor = (q.correctOption === k) ? '#48BB78' : '#CBD5E0';
                buildOptions += `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:12px; height:12px; border-radius:50%; background:${dotColor};"></div>
                        <div style="border:1px solid #CBD5E0; border-radius:8px; padding:10px 15px; width:100%; color:#4A5568;">${label}</div>
                    </div>
                `;
            });

            d.innerHTML = `
                <div style="color:#4A5568; font-size:14px; margin-bottom:5px;">Question ${idx+1}</div>
                <div style="border:1px solid #718096; border-radius:8px; padding:15px 20px; font-weight:500; font-size:16px; margin-bottom:20px;">
                    ${q.questionText}
                </div>
                <div class="question-grid">
                    ${buildOptions}
                </div>
            `;
            assesList.appendChild(d);
        });
    }
}

function editCourse() {
    editCourseAction(currentViewingCourseId);
}

function editCourseAction(id) {
    const c = courses.find(cc => cc.id === id);
    if (!c) return;
    editingCourseId = id;
    
    document.getElementById('courseName').value = c.name || '';
    document.getElementById('courseDesc').value = c.description || '';
    document.getElementById('courseDuration').value = c.durationMins || '';
    
    pendingSections = c.sections && c.sections.length > 0 ? c.sections.map((s, idx) => ({
        id: idx + 1,
        name: s.name,
        fileName: s.pptUrl || 'Choose PDF file',
        durationMins: s.durationMins
    })) : [{id: 1}];
    
    pendingQuestions = c.questions && c.questions.length > 0 ? c.questions.map((q, idx) => ({
        id: idx + 1,
        text: q.questionText,
        a: q.optionA,
        b: q.optionB,
        c: q.optionC,
        d: q.optionD,
        correct: q.correctOption
    })) : [{id: 1}];
    
    showTab('add-course', 'Edit Course');
}

let courseToDeleteId = null;
function confirmDelete() {
    const c = courses.find(cc => cc.id === currentViewingCourseId);
    courseToDeleteId = currentViewingCourseId;
    document.getElementById('customModalBody').innerHTML = `Are you sure you want to delete<br>"${c.name}"?`;
    document.getElementById('customModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('customModal').style.display = 'none';
    courseToDeleteId = null;
}

document.getElementById('customModalConfirmBtn').addEventListener('click', async () => {
    if (courseToDeleteId) {
        try {
            await fetch(`${API_BASE}/courses/${courseToDeleteId}`, {
                method: 'DELETE'
            });
            closeModal();
            showNotification("Course deleted successfully");
            showTab('course-list', 'Course List');
        } catch(e) {
            alert("Error deleting course");
        }
    }
});

/* === Student Progress Table (Image 25) === */
function renderStudentProgress() {
    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = '';
        
    studentProgress.forEach(s => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => viewStudentProgress(s);
        tr.innerHTML = `
            <td><strong>${s.name}</strong></td>
            <td>${s.courseName}</td>
            <td>${s.comp}%</td>
            <td>
                <span class="badge-status ${s.cls}">${s.status}</span>
                <span class="chev-right">&gt;</span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function viewStudentProgress(s) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    
    document.getElementById('subViewTitle').textContent = s.name + "'s Progress";
    document.getElementById('subViewActions').style.display = 'none';
    document.getElementById('student-details-view').style.display = 'block';

    document.getElementById('pgCourseName').textContent = s.courseName;
    document.getElementById('pgPercent').textContent = `${s.comp}% Completed`;
    document.getElementById('pgBar').style.width = `${s.comp}%`;
    document.getElementById('pgTask1').textContent = s.courseName;
    document.getElementById('pgAssesStatus').textContent = s.comp === 100 ? "Passed" : (s.comp > 0 ? "Started" : "Pending");

    let datesHtml = "";
    if (s.enrollment && s.enrollment.enrolledAt) {
        datesHtml += `Start Date: ${new Date(s.enrollment.enrolledAt).toLocaleDateString()}`;
    }
    if (s.enrollment && s.enrollment.completedAt) {
        datesHtml += ` | End Date: ${new Date(s.enrollment.completedAt).toLocaleDateString()}`;
    }
    document.getElementById('pgDates').textContent = datesHtml;

    document.getElementById('pgAssessmentDetails').style.display = 'none';
    document.getElementById('pgAssessmentDetails').innerHTML = 'Loading assessment details...';
    
    if (s.enrollment && s.enrollment.id) {
        fetch(`${API_BASE}/assessments/attempts/${s.enrollment.id}`)
            .then(res => res.json())
            .then(attempts => {
                if (attempts && attempts.length > 0) {
                    // Show latest attempt
                    const latest = attempts[attempts.length - 1];
                    let correctCount = 0;
                    let wrongCount = 0;
                    let html = `<p style="margin-bottom:15px;"><strong>Attempt #${latest.attemptNumber}</strong> - Score: ${latest.scorePercentage}% - ${latest.passed ? 'Passed' : 'Failed'}</p>`;
                    
                    const course = s.enrollment.course;
                    if (course && course.questions && latest.answers) {
                        html += `<div style="display:flex; flex-direction:column; gap:10px;">`;
                        course.questions.forEach((q, i) => {
                            let studentAns = latest.answers[q.id] || "No Answer";
                            let isCorrect = studentAns === q.correctOption;
                            if (isCorrect) correctCount++; else wrongCount++;
                            let bgColor = isCorrect ? '#C6F6D5' : '#FED7D7';
                            let icon = isCorrect ? `<span style="color:#2F855A; font-weight:bold;">&#10003;</span>` : `<span style="color:#C53030; font-weight:bold;">&#10007;</span>`;
                            let userPickedLabel = studentAns !== "No Answer" ? q['option' + studentAns] : "No Answer";
                            
                            html += `
                            <div style="background:${bgColor}; padding:10px 15px; border-radius:6px; font-size:14px; border:1px solid ${isCorrect ? '#9AE6B4' : '#FEB2B2'};">
                                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                    <strong>Q${i+1}: ${q.questionText}</strong>
                                    ${icon}
                                </div>
                                <div style="color:#4A5568;">Student picked: ${userPickedLabel} (Option ${studentAns})</div>
                                ${!isCorrect ? `<div style="color:#2F855A; margin-top:3px;">Correct Answer: Option ${q.correctOption}</div>` : ''}
                            </div>
                            `;
                        });
                        html += `</div>`;
                        html = `<p style="margin-bottom:15px;"><strong>Summary:</strong> ${correctCount} Correct, ${wrongCount} Wrong</p>` + html;
                    }
                    document.getElementById('pgAssessmentDetails').innerHTML = html;
                } else {
                    document.getElementById('pgAssessmentDetails').innerHTML = '<p>No attempts documented yet.</p>';
                }
            })
            .catch(err => {
                document.getElementById('pgAssessmentDetails').innerHTML = '<p>Error loading details.</p>';
            });
    }
}

function toggleAssessmentDetails() {
    const el = document.getElementById('pgAssessmentDetails');
    el.style.display = (el.style.display === 'none') ? 'block' : 'none';
}
    


// Initial setup
document.addEventListener('DOMContentLoaded', () => {
});
