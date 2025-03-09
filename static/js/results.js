// Function to equalize the heights of all open dropdowns
function equalizeDropdownHeights() {
    const dropdowns = document.querySelectorAll('.dropdown-content');
    let openDropdowns = Array.from(dropdowns).filter(div => div.style.display === "block");
    if (openDropdowns.length === 0) return;
    openDropdowns.forEach(div => div.style.height = "");
    let maxHeight = Math.max(...openDropdowns.map(div => div.scrollHeight));
    openDropdowns.forEach(div => {
        div.style.height = maxHeight + "px";
    });
    }

    // Toggle function for a given heading and its target content
    function toggleDropdown(headingId, contentId) {
    const heading = document.getElementById(headingId);
    const content = document.getElementById(contentId);
    if (content.style.display === "block") {
        content.style.display = "none";
        heading.querySelector('.symbol').textContent = "—";
        content.style.height = "";
    } else {
        content.style.display = "block";
        heading.querySelector('.symbol').textContent = "|";
    }
    equalizeDropdownHeights();
    }

    document.getElementById("backBtn").addEventListener("click", async () => {
    console.log("Back button clicked. Stopping FastAPI...");

    try {
        let stopResponse = await fetch('/stop_simulation', { method: 'POST' });
        let stopData = await stopResponse.json();

        if (stopResponse.ok) {
        console.log("✅ FastAPI stopped:", stopData.message);
        // Redirect back to the parameters page
        window.location.href = "/parameters";
        } else {
        console.error("❌ Error stopping FastAPI:", stopData.error);
        }
    } catch (error) {
        console.error("❌ Error sending stop request:", error);
    }
    });

    // Attach event listeners for all dropdown headings
    document.getElementById("configHeading").addEventListener("click", function () {
    toggleDropdown("configHeading", "configContent");
    });
    document.getElementById("junctionHeading").addEventListener("click", function () {
    toggleDropdown("junctionHeading", "junctionContent");
    });
    document.getElementById("trafficHeading").addEventListener("click", function () {
    toggleDropdown("trafficHeading", "trafficContent");
    });
    document.getElementById("defaultTrafficHeading").addEventListener("click", function () {
    toggleDropdown("defaultTrafficHeading", "defaultTrafficContent");
    });

document.addEventListener('DOMContentLoaded', function () {
    const tutorialButton = document.getElementById('tutorial-button');
    const tutorialPopup = document.getElementById('tutorial-popup');
    const tutorialClose = document.getElementById('tutorial-close');

    tutorialButton.addEventListener('click', function () {
        tutorialPopup.style.display = 'block';
    });

    tutorialClose.addEventListener('click', function () {
        tutorialPopup.style.display = 'none';
    });

    // Close the popup when clicking outside of the content area
    tutorialPopup.addEventListener('click', function (e) {
        if (e.target === tutorialPopup) {
        tutorialPopup.style.display = 'none';
        }
    });
    });

