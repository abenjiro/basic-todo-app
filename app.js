const API_URL = "https://basic-todo-api-sage.vercel.app/api/task";

// DOM elements
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("task");
const pendingList = document.querySelector(".pending-list");
const completedList = document.querySelector(".completed-list");

// Load tasks on page load
document.addEventListener("DOMContentLoaded", async () => {
    const tasks = await fetchTasks();
    renderTasks(tasks);
    fetchActivityLogs(); // load logs on startup
    loadTaskAnalytics();

});

// Fetch all tasks
async function fetchTasks() {
    const loader = document.getElementById("loading");
    loader.style.display = "block";

    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        return data.data || [];
    } catch (err) {
        console.error("Fetch error:", err);
        return [];
    } finally {
        loader.style.display = "none";
    }
}


// Submit new task
taskForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const taskText = taskInput.value.trim();
    const priority = document.querySelector("input[name=priority]:checked").value;
    const submitBtn = taskForm.querySelector("button[type=submit]");

    if (!taskText) {
        alert('Please enter a task');
        return;
    }

    // button events
    submitBtn.disabled = true;
    submitBtn.textContent = "Adding...";
    const loader = document.getElementById("loading");
    loader.style.display = "block";

    try {
        let res;
        if (editingTaskId) {
            // Update existing task
            loader.innerHTML = "Updating tasks, please wait ..."
            res = await fetch(`${API_URL}/${editingTaskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description: taskText, priority })
            });
        } else {
            // Create new task
            loader.innerHTML = "Adding tasks, please wait ..."
            res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: taskText,
                    priority,
                    completed: false
                })
            });
        }


        if (res.ok) {
            const newTask = await res.json();
            await loadAndRefresh();
            taskForm.reset();
            loader.style.display = "none";
        }
    } catch (err) {
        console.error("Create error:", err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Add Task";
        editingTaskId = null;
        loader.style.display = "none";

    }
});


// Render list of tasks
function renderTasks(tasks, append = false) {
    if (!append) {
        pendingList.innerHTML = "";
        completedList.innerHTML = "";
    }

    const p_list = tasks?.filter(t => !t.completed) || [];
    const c_list = tasks?.filter(t => t.completed) || [];

    // Show empty messages if needed
    if (p_list.length === 0) {
        pendingList.innerHTML = "<p style='text-align: center;'>NB: You have no pending task, click on <b>Add Task</b> button to add new task.</p>";
    }

    if (c_list.length === 0) {
        completedList.innerHTML = "<p style='text-align: center;'>NB: You have no completed task</p>";
    }


    tasks.forEach((task) => {
        const taskDiv = document.createElement("div");
        const baseClass = task.completed ? "complete-task" : "task";
        taskDiv.className = `${baseClass} priority-${task.priority.toLowerCase()}`;

        if (!task.completed) {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `task-${task.id}`;

            checkbox.addEventListener("change", async () => {
                const loader = document.getElementById("loading");
                loader.style.display = "block";
                loader.innerHTML = "Completing tasks, please wait ..."
                await updateTask(task.id, { completed: true });
                loadAndRefresh();
            });

            const label = document.createElement("label");
            label.setAttribute("for", checkbox.id);
            label.textContent = task.description;

            const meta = document.createElement("span");
            meta.className = "meta";
            const date = new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            meta.textContent = ` ${capitalize(task.priority)} | ${date}`;

            // Delete button
            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = "&#128465;";
            deleteBtn.className = "delete-task";
            deleteBtn.title = "Delete task";
            deleteBtn.addEventListener("click", async () => {

                const confirmDelete = confirm("Are you sure you want to delete this task?");
                if (confirmDelete) {
                    await deleteTask(task.id);
                }
            });

            // Edit button
            const editBtn = document.createElement("button");
            editBtn.innerHTML = "&#9998;";
            editBtn.className = "edit-task";
            editBtn.title = "Edit task";
            editBtn.addEventListener("click", () => {
                editTask(task);
            });

            taskDiv.appendChild(checkbox);
            taskDiv.appendChild(label);
            taskDiv.appendChild(deleteBtn);
            taskDiv.appendChild(editBtn);
            taskDiv.appendChild(meta);

            pendingList.appendChild(taskDiv);
        } else {
            const label = document.createElement("span");
            label.textContent = task.description;

            const meta = document.createElement("span");
            meta.className = "meta";
            const date = new Date(task.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            meta.textContent = ` ${capitalize(task.priority)} | ${date}`;

            // Delete button for completed task
            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = "&#128465;";
            deleteBtn.className = "delete-task";
            deleteBtn.title = "Delete task";
            deleteBtn.addEventListener("click", async () => {
                const confirmDelete = confirm("Delete this completed task?");
                if (confirmDelete) {
                    await deleteTask(task.id);
                }
            });

            taskDiv.appendChild(label);
            taskDiv.appendChild(deleteBtn);
            taskDiv.appendChild(meta);

            completedList.appendChild(taskDiv);
        }
    });
}

// Update task
async function updateTask(id, updateData) {
    try {
        const res = await fetch(`${API_URL}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData)
        });
        return await res.json();
    } catch (err) {
        console.error("Update error:", err);
    }
}

// Delete task (optional UI hook)
async function deleteTask(id) {
    try {
        const loader = document.getElementById("loading");
        loader.innerHTML = "Deleting tasks, please wait ...";
        loader.style.display = "block";

        const res = await fetch(`${API_URL}/${id}`, {
            method: "DELETE"
        });
        if (res.ok) {
            loadAndRefresh();
        }
    } catch (err) {
        console.error("Delete error:", err);
    }
}

// Helper: reload task list
function loadAndRefresh() {
    fetchTasks().then(renderTasks);
    fetchActivityLogs();
    loadTaskAnalytics();
}

// Helper: capitalize string
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

let editingTaskId = null;

function editTask(task) {
    // Set task text in textarea
    taskInput.value = task.description;

    // Set the appropriate priority
    const priorityInput = document.querySelector(`input[name="priority"][value="${task.priority.toLowerCase()}"]`);
    if (priorityInput) {
        priorityInput.checked = true;
    }

    // Update button text and state
    const submitBtn = taskForm.querySelector("button[type=submit]");
    submitBtn.textContent = "Update Task";

    // Track the task being edited
    editingTaskId = task.id;
}

async function fetchActivityLogs() {
    try {
        const res = await fetch(`${API_URL}/logs`);
        const data = await res.json();
        renderActivityLogs(data?.data || []);
    } catch (err) {
        console.error("Activity fetch error:", err);
    }
}

function renderActivityLogs(logs) {
    const activityList = document.getElementById("activityList");
    activityList.innerHTML = "";

    if (logs.length === 0) {
        activityList.innerHTML = "<p>No recent activity</p>";
        return;
    }

    logs.forEach(log => {
        const p = document.createElement("p");
        const relativeTime = timeAgo(log.created_at);
        p.textContent = `${log.description} (${relativeTime})`;
        activityList.appendChild(p);
    });
}


function timeAgo(timestamp) {
    const now = new Date();
    const createdAt = new Date(timestamp);
    const diffMs = now - createdAt;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "just now";
    if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
    return `${days} day${days > 1 ? "s" : ""} ago`;
}

let myChart = null; // Make this global

async function loadTaskAnalytics() {
    try {
        console.log('htell')
        const res = await fetch(`${API_URL}/analytics`);
        const { data } = await res.json();
        const stats = data[0];
        console.log("hte")

        const totalCompleted = parseInt(stats.total_completed);
        const totalPending = parseInt(stats.total_pending);
        const totalTasks = totalCompleted + totalPending;
        const ctx = document.getElementById('myChart').getContext('2d');

        // Destroy the previous chart if it exists
        if (myChart !== null) {
            myChart.destroy();
        }

        myChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pending Task', 'Completed Task'],
                datasets: [{
                    label: 'My Todo Analysis',
                    data: [totalPending, totalCompleted],
                    backgroundColor: ['rgb(255, 99, 132)', 'rgb(54, 162, 235)'],
                    hoverOffset: 4
                }]
            },
            options: {
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                let value = context.parsed || 0;
                                return `${label}: ${value}`;
                            },
                            afterBody: function () {
                                return `Total Tasks: ${totalTasks}`;
                            }
                        }
                    }
                }
            }
        });

    } catch (err) {
        console.error("Analytics fetch error:", err);
    }
}
