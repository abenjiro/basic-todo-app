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
