const API_URL = "http://127.0.0.1:8000";

const body = document.getElementById("followersBody");
const statusText = document.getElementById("status");
const refreshButton = document.getElementById("refreshButton");
function formatTime(seconds) {
    if (seconds === null || seconds === undefined) {
        return "FAILED";
    }

    return `${Number(seconds).toFixed(2)} s`;
}

async function loadFollowers() {
    statusText.textContent = "Loading the sacred records...";
    body.innerHTML = "";

    try {
        const response = await fetch(`${API_URL}/cult`);

        if (!response.ok) {
            throw new Error("Could not retrieve the cult records.");
        }

        const followers = await response.json();

        if (followers.length === 0) {
            statusText.textContent = "No applicants have entered the records yet.";
            return;
        }

        statusText.textContent =
            `${followers.length} record(s) found.`;

        followers.forEach(member => {
            const row = document.createElement("tr");

            if (member.rank === 1) {
                row.classList.add("rank-one");
            }

            if (!member.passed) {
                row.classList.add("servant");
            }

            row.innerHTML = `
                <td>${member.rank ?? "—"}</td>
                <td>${escapeHtml(member.name)}</td>
                <td>${escapeHtml(member.role)}</td>
                <td>${escapeHtml(member.power)}</td>
                <td>${formatTime(member.completion_time)}</td>
                <td>
                    <button class="edit-btn" onclick="editMember(${member.id})">EDIT</button>
                    <button class="delete-btn" onclick="deleteMember(${member.id})">DELETE</button>
                </td>
            `;

            body.appendChild(row);
        });

    } catch (error) {
        statusText.innerHTML =
            `<span id="error">Unable to contact the cult database.</span>`;
    }
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}

refreshButton.addEventListener("click", loadFollowers);
async function deleteMember(id) {
    if (!confirm("Are you sure you want to remove this member?")) return;

    const response = await fetch(`${API_URL}/cult/${id}`, {
        method: "DELETE"
    });

    if (response.ok) {
        loadFollowers();
    } else {
        alert("Could not delete this member.");
    }
}

async function editMember(id) {
    const newName = prompt("New name:");
    if (!newName || !newName.trim()) return;

    const newPower = prompt("New power / contribution:");
    if (!newPower || !newPower.trim()) return;

    const response = await fetch(`${API_URL}/cult/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), power: newPower.trim() })
    });

    if (response.ok) {
        loadFollowers();
    } else {
        alert("Could not update this member.");
    }
}
loadFollowers();
