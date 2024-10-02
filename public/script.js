// Check if the user is logged in
const token = localStorage.getItem('token');
if (!token) location.href = "/login";
loadAccountInfo()


function loadAccountInfo() {
    document.getElementById('username').innerHTML = localStorage.getItem('dayTrackerUsername') ? "@" + localStorage.getItem('dayTrackerUsername') : '';
    document.getElementById('firstLetter').innerHTML = localStorage.getItem('dayTrackerUsername') ? localStorage.getItem('dayTrackerUsername').charAt(0).toUpperCase() : '';
}

// Task names
const tasks = ["Wakeup", "Learning", "Sunlight", "Drink Water", "Workout", "Food Timing", "Sleeping"];

// Initialize tasks on the page
function initializeTasks() {
    const taskContainer = document.getElementById('task-container');
    tasks.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'task';
        taskDiv.innerHTML = `
            <h1>${task}</h1>
            <div class="status">
                ${createRadioButton(task, 'good', 'Good')}
                ${createRadioButton(task, 'average', 'Average')}
                ${createRadioButton(task, 'bad', 'Bad')}
            </div>
        `;
        taskContainer.appendChild(taskDiv);
    });
}

// Create a radio button for a task
function createRadioButton(task, value, label) {
    return `
        <input type="radio" id="${task.toLowerCase()}-${value}" class="${value}-radio" name="${task.toLowerCase()}" value="${value}" onclick="handleRadioClick(this)">
        <label for="${task.toLowerCase()}-${value}">${label}</label>
    `;
}

// Handle radio button click
function handleRadioClick(radio) {
    changeStatusColor(radio);
    submitDayTracker();
}

// Change the background color based on the task's status
function changeStatusColor(radio) {
    const statusDiv = radio.closest('.status'); // Get the parent status div
    const status = radio.value; // Get the value of the selected radio button

    // Set background color based on the radio value
    switch (status) {
        case 'good':
            statusDiv.style.backgroundColor = '#A8E6A3'; // Green for "Good"
            break;
        case 'average':
            statusDiv.style.backgroundColor = '#FFD180'; // Orange for "Average"
            break;
        case 'bad':
            statusDiv.style.backgroundColor = '#FF9999'; // Red for "Bad"
            break;
        default:
            statusDiv.style.backgroundColor = ''; // Reset background if none selected
    }

    updateChart();
}

// Update the pie chart with task status counts
function updateChart() {
    const goodCount = document.querySelectorAll('input[type="radio"][value="good"]:checked').length;
    const averageCount = document.querySelectorAll('input[type="radio"][value="average"]:checked').length;
    const badCount = document.querySelectorAll('input[type="radio"][value="bad"]:checked').length;
    const totalCount = goodCount + averageCount + badCount;

    const goodPercent = (goodCount / totalCount) * 100 || 0;
    const averagePercent = (averageCount / totalCount) * 100 || 0;
    const badPercent = (badCount / totalCount) * 100 || 0;

    const pieChart = document.getElementById('pieChart');
    pieChart.style.background = `conic-gradient(
        #A8E6A3 0% ${goodPercent}%,  /* Good */
        #FFD180 ${goodPercent}% ${goodPercent + averagePercent}%, /* Average */
        #FF9999 ${goodPercent + averagePercent}% 100% /* Bad */
    )`;

    updatePercentageDisplay(goodPercent, averagePercent, badPercent);
}

// Update the percentage display for task statuses
function updatePercentageDisplay(goodPercent, averagePercent, badPercent) {
    const percentageElement = document.getElementById("percentage");
    percentageElement.innerHTML = `
        <div class="green"></div> ${goodPercent.toFixed(2)}% Good<br>
        <div class="yellow"></div> ${averagePercent.toFixed(2)}% Average<br>
        <div class="red"></div> ${badPercent.toFixed(2)}% Bad<br>
    `;
}

// Show today's date by default
function showTodayDate() {
    document.getElementById("allDate").classList.remove('active');
    document.querySelectorAll('.days button')[0].classList.add('active');
    document.getElementById("allDate")[0].selected = true;
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    document.getElementById('dateDisplay').innerHTML = `Daily Route (${formattedDate})`;
    document.getElementById('date').value = formattedDate;

    getTasksByDate(formattedDate);
}

// Submit day tracker data to the backend
function submitDayTracker() {
    const tasks = [];
    document.querySelectorAll('.task').forEach(taskDiv => {
        const taskName = taskDiv.querySelector('h1').textContent.toLowerCase();
        const status = taskDiv.querySelector('input[type="radio"]:checked')?.value || 'none';
        tasks.push({ name: taskName, status });
    });

    const date = document.getElementById("date").value;
    const token = localStorage.getItem('token'); // Make sure token exists

    if (!token) {
        console.error('No token found, user might not be logged in.');
        return; // Stop the function if token is missing
    }

    fetch('/api/submit-tasks', {  // Corrected URL
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`  // Add token in Authorization header
        },
        body: JSON.stringify({ date, tasks })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(() => console.log('Tasks saved successfully!'))
        .catch(error => console.error('Failed to save tasks:', error));
}



// Fetch tasks for a specific date
function getTasksByDate(date) {
    fetch(`/api/tasks/${encodeURIComponent(date)}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (!data.error) {
                populateTasks(data.tasks);
            } else {
                console.log("No data found for this date.");
            }
        })
        .catch(error => console.error('Error fetching tasks:', error));
}

// Populate tasks with data from the server
function populateTasks(tasks) {
    tasks.forEach(task => {
        const radioButton = document.querySelector(`input[name="${task.name.toLowerCase()}"][value="${task.status.toLowerCase()}"]`);
        if (radioButton) {
            radioButton.checked = true;
            changeStatusColor(radioButton);
        }
    });
}

// Fetch all tasks and populate the date dropdown
function getAllTasks() {
    fetch('/api/tasks', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data => {
            const dateSelectElement = document.getElementById("allDate");
            data.forEach(task => {
                dateSelectElement.innerHTML += `<option value="${task.date}">${task.date}</option>`;
            });
        })
        .catch(error => console.error('Failed to retrieve tasks:', error));
}

// Handle date change from the dropdown
function changeDate(el) {
    document.querySelectorAll('.days button')[0].classList.remove('active');
    document.getElementById("allDate").classList.add('active');
    const date = el.value;
    document.getElementById('date').value = date;
    document.getElementById('dateDisplay').innerHTML = `Daily Route (${date})`;
    date != 'none' ? getTasksByDate(date) : false;
}

// Initialize tasks and load today's tasks on page load
document.addEventListener("DOMContentLoaded", function () {
    initializeTasks();
    showTodayDate();
    getAllTasks();
});

// Open popup when clicks on #openPopup element
document.addEventListener("DOMContentLoaded", function () {
    // Get the popup and the button that opens it
    const popup = document.getElementById("popup");
    const openPopup = document.getElementById("openPopup");
    const closePopup = document.getElementById("closePopup");

    // Open the popup when the button is clicked
    openPopup.onclick = function () {
        popup.style.display = "block";
    }

    // Close the popup when the close button is clicked
    closePopup.onclick = function () {
        popup.style.display = "none";
    }

    // Close the popup when clicking outside of the popup
    window.onclick = function (event) {
        if (event.target == popup) {
            popup.style.display = "none";
        }
    }
});


function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('dayTrackerUsername');
    location.reload();
}

function openInfo() {
    if(document.getElementById('logout').style.display == 'block') {
        document.getElementById('logout').style.display = 'none';
        document.getElementById('username').style.display = 'none';
    } else {
        document.getElementById('logout').style.display = 'block';
        document.getElementById('username').style.display = 'block';
    }
}
