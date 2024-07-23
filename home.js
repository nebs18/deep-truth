let currentNoteToDelete;
let currentNoteToEdit;
let currentNoteContent;
let userPasscode = '';

// Function to add a new note
// Function to add a new note
function addNote() {
    const isEncrypted = false;
    const noteTitle = 'New Diary Entry'; // Default title for new notes
    const noteContent = 'a'; // Use an empty string for new notes

    fetch('http://localhost:3000/notes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, title: noteTitle, content: noteContent, isEncrypted: isEncrypted })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Note added successfully:', data);
        displayNote(data.noteId, noteTitle, noteContent, isEncrypted);
    })
    .catch(error => {
        console.error('Error adding note:', error);
        showModal('Failed to add note. Please try again.');
    });
}

// Function to fetch notes for a specific user
function fetchNotes(email) {
    fetch(`http://localhost:3000/users?email=${email}`)
        .then(response => response.json())
        .then(user => {
            if (user) {
                userId = user.id; // Update userId from fetched user
                return fetch(`http://localhost:3000/notes?user_id=${userId}`);
            } else {
                console.error('User not found');
                throw new Error('User not found');
            }
        })
        .then(response => response.json())
        .then(notes => {
            renderNotes(notes);
        })
        .catch(error => {
            console.error('Error fetching notes:', error);
            showModal('Error occurred while fetching notes.');
        });
}

// Render notes in the UI
function renderNotes(notes) {
    const notesGrid = document.getElementById('notesGrid');
    notesGrid.innerHTML = ''; // Clear existing notes

    notes.forEach(note => {
        displayNote(note.id, note.title, note.content);
    });
}

// Function to fetch the user's passcode from the server


function fetchUserPasscode(userId) {
    if (!userId) {
        return;
    }
    fetch(`http://localhost:3000/user/passcode/${userId}`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        userPasscode = data.passcode; // Store the passcode in the global variable
        console.log('User passcode fetched:', userPasscode);
    })
    .catch(error => {
        console.error('Fetch error:', error);
    });
}

// Call this function when the user logs in
const userId = sessionStorage.getItem('userId');
if (userId) {
    fetchUserPasscode(userId);
}


// Function to display a single note in the UI
function displayNote(id, title, content, isEncrypted) {
    const notesGrid = document.getElementById('notesGrid');
    const noteCard = document.createElement('div');
    noteCard.className = 'note-card';
    noteCard.dataset.id = id;
    noteCard.id = `note-${id}`;

    // Add the isEncrypted class if the note is encrypted
    if (isEncrypted === 'true') {
        noteCard.classList.add('isEncrypted');
    } else {
        noteCard.classList.remove('isEncrypted');
    }

    const deleteIcon = document.createElement('span');
    deleteIcon.className = 'delete-icon';
    deleteIcon.innerHTML = '&times;';
    deleteIcon.onclick = function(event) {
        event.stopPropagation();
        currentNoteToDelete = noteCard;
        document.getElementById('deleteModal').style.display = 'flex';
    };
    noteCard.appendChild(deleteIcon);

    const noteTitleElem = document.createElement('h3');
    noteTitleElem.className = 'note-title';
    noteTitleElem.textContent = title;
    noteCard.appendChild(noteTitleElem);

    const noteContentElem = document.createElement('p');
    noteContentElem.className = 'note-content';
    noteContentElem.dataset.originalContent = content; // Store original content
    if (isEncrypted === 'true') {
        noteContentElem.textContent = 'Encrypted content. Decrypt to view.';
    } else {
        noteContentElem.textContent = content;
    }
    noteCard.appendChild(noteContentElem);

    const encryptButton = document.createElement('button');
    encryptButton.className = 'note-action-button';
    encryptButton.textContent = 'Encrypt';
    encryptButton.disabled = isEncrypted === 'true'; // Disable if already encrypted
    encryptButton.onclick = function(event) {
        event.stopPropagation();
        encryptNoteContent(noteCard, noteContentElem);
    };
    noteCard.appendChild(encryptButton);

    const decryptButton = document.createElement('button');
    decryptButton.className = 'note-action-button';
    decryptButton.textContent = 'Decrypt';
    decryptButton.disabled = isEncrypted === 'false'; // Disable if already decrypted
    decryptButton.onclick = function(event) {
        event.stopPropagation();
        decryptNoteContent(noteCard, noteContentElem);
    };
    noteCard.appendChild(decryptButton);

    noteCard.onclick = function() {
        if (noteCard.classList.contains('isEncrypted')) {
            showModal('This note is encrypted. Please decrypt it to view the content.');
        } else {
            currentNoteToEdit = noteCard;
            currentNoteContent = noteContentElem;
            document.getElementById('noteTitle').value = title;
            document.getElementById('noteContent').value = content;
            document.getElementById('editModal').style.display = 'flex';
            document.getElementById('editModal').dataset.noteId = id;
        }
    };

    notesGrid.appendChild(noteCard);
}


function encryptNoteContent(noteCard, noteContentElem) {
    console.log('Encrypting note content...');
    if (userPasscode) {
        const isEncrypted = true;
        const originalContent = noteContentElem.dataset.originalContent; // Get original content from dataset
        console.log('Original content:', originalContent);

        // Hash the passcode using SHA-256
        const hashedPasscode = CryptoJS.SHA256(userPasscode).toString(CryptoJS.enc.Hex);
        console.log('Hashed passcode:', hashedPasscode);

        // Encrypt the content using the hashed passcode
        const encryptedContent = CryptoJS.AES.encrypt(originalContent, hashedPasscode).toString();
        console.log('Encrypted content:', encryptedContent);

        // Update UI
        noteContentElem.textContent = encryptedContent;
        noteContentElem.dataset.encrypted = 'true'; // Update encryption status
        noteContentElem.dataset.encryptedContent = encryptedContent; // Store encrypted content
        noteCard.classList.add('encrypted'); // Apply encrypted class

        // Save the encrypted content to the server
        const noteId = noteCard.dataset.id;
        const noteTitle = noteCard.querySelector('.note-title').textContent;

        fetch(`http://localhost:3000/notes/${noteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: noteTitle, content: encryptedContent, isEncrypted: isEncrypted })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Note updated with encrypted content:', data);
        })
        .catch(error => {
            console.error('Error updating note with encrypted content:', error);
        });
    } else {
        alert('Passcode not set.');
    }
}

function decryptNoteContent(noteCard, noteContentElem) {
    const encryptedContent = noteContentElem.dataset.encryptedContent; // Use the stored encrypted content
    const passcode = prompt('Enter passcode to decrypt the note:');

    if (passcode) {
        console.log('Attempting to decrypt content...');
        console.log('Encrypted content:', encryptedContent);

        // Hash the entered passcode using SHA-256
        const hashedPasscode = CryptoJS.SHA256(passcode).toString(CryptoJS.enc.Hex);
        console.log('Hashed passcode:', hashedPasscode);

        try {
            // Decrypt the content using the hashed passcode
            const bytes = CryptoJS.AES.decrypt(encryptedContent, hashedPasscode);
            const decryptedContent = bytes.toString(CryptoJS.enc.Utf8);
            console.log('Decrypted content:', decryptedContent);

            if (decryptedContent) {
                noteContentElem.textContent = decryptedContent;
                noteContentElem.dataset.encrypted = 'false'; // Update encryption status
                noteCard.classList.remove('encrypted'); // Remove encrypted class

                // Optionally, update the note on the server
                const noteId = noteCard.dataset.id;
                const noteTitle = noteCard.querySelector('.note-title').textContent;

                fetch(`http://localhost:3000/notes/${noteId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ title: noteTitle, content: decryptedContent, isEncrypted: 'false' })
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Note updated with decrypted content:', data);
                })
                .catch(error => {
                    console.error('Error updating note with decrypted content:', error);
                });
            } else {
                alert('Decryption failed. Content might be corrupted.');
            }
        } catch (e) {
            alert('Decryption failed. Please check the passcode and content.');
            console.error('Decryption error:', e);
        }
    } else {
        alert('Passcode is required.');
    }
}


// Event listener for saving the note
document.getElementById('saveNote').onclick = function() {
    const noteId = document.getElementById('editModal').dataset.noteId;
    const newTitle = document.getElementById('noteTitle').value;
    const newContent = document.getElementById('noteContent').value;

    let encryptedContent = newContent;
    let isEncrypted = false;

    // Encrypt the content if a user passcode is available
    if (userPasscode) {
        encryptedContent = CryptoJS.AES.encrypt(newContent, userPasscode).toString();
        isEncrypted = true;
    }

    fetch(`http://localhost:3000/notes/${noteId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newTitle, content: encryptedContent, isEncrypted: isEncrypted })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Server response:', data); // Log the server response for debugging
        if (data.message === 'Note updated successfully') {
            // Update the note card in the UI
            const noteCard = document.querySelector(`[data-id="${noteId}"]`);
            if (noteCard) {
                noteCard.querySelector('.note-title').textContent = newTitle;
                noteCard.querySelector('.note-content').textContent = isEncrypted ? 'Encrypted content. Decrypt to view.' : newContent;
                noteCard.dataset.encrypted = isEncrypted.toString();
                closeModal();
            } else {
                showModal('Note card not found.');
            }
        } else {
            showModal('Failed to update note: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error updating note:', error);
        showModal('An error occurred while updating the note.');
    });
};


// Delete note functionality
document.getElementById('confirmDelete').onclick = function() {
    if (currentNoteToDelete) {
        const noteId = currentNoteToDelete.dataset.id;
        fetch(`http://localhost:3000/notes/${noteId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.message === 'Note deleted successfully') {
                currentNoteToDelete.remove();
                currentNoteToDelete = null;
            } else {
                showModal('Failed to delete note.');
            }
        })
        .catch(error => {
            console.error('Error deleting note:', error);
            showModal('An error occurred while deleting the note.');
        })
        .finally(() => {
            document.getElementById('deleteModal').style.display = 'none';
        });
    } else {
        console.error('currentNoteToDelete is not defined');
    }
};

// Close modal function
function closeModal() {
    const editModal = document.getElementById('editModal');
    editModal.style.display = 'none';
}

// Show modal function
function showModal(message) {
    const modalMessage = document.getElementById('modal-message');
    const modal = document.getElementById('modal');

    if (modalMessage && modal) {
        modalMessage.textContent = message;
        modal.style.display = 'flex';

        const closeButton = modal.querySelector('.modal-button');
        if (closeButton) {
            closeButton.onclick = function() {
                modal.style.display = 'none';
            };
        }
    } else {
        console.error('modal-message or modal element not found');
    }
}

// Fetch notes and user passcode on page load
window.onload = function() {
    const userId = sessionStorage.getItem('userId');
    fetchUserPasscode(userId);
};



// Event listener for closing modals when clicking outside of them
window.onclick = function(event) {
    const deleteModal = document.getElementById('deleteModal');
    const editModal = document.getElementById('editModal');

    if (event.target === deleteModal) {
        deleteModal.style.display = 'none';
    } else if (event.target === editModal) {
        editModal.style.display = 'none';
    }
};


// Toggle user menu visibility
function toggleUserMenu() {
    const menu = document.getElementById('userMenu');
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
}

// Add this listener to handle "Change Passcode" menu item click
document.getElementById('userMenu').addEventListener('click', function(event) {
    if (event.target.textContent === 'Change Passcode') {
        document.getElementById('changePasscodeModal').style.display = 'block';
    }
});

document.getElementById('logoutLink').onclick = function() {
    document.getElementById('logoutModal').style.display = 'flex';
};

// Close logout modal
function closeLogoutModal() {
    document.getElementById('logoutModal').style.display = 'none';
}

// Confirm logout
function confirmLogout() {
    logout(); 
}

// Logout function
function logout() {
    const email = sessionStorage.getItem('userEmail'); // Ensure the user's email is stored in sessionStorage

    fetch('http://localhost:3000/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message === 'Logout successful') {
            sessionStorage.removeItem('userId');
            sessionStorage.removeItem('userEmail');
            window.location.href = data.redirect; // Redirect to login page or another destination
        } else {
            console.error('Failed to logout:', data.message);
        }
    })
    .catch(error => {
        console.error('Error during logout:', error);
    });
}



// Close dropdowns and modals on window click
window.onclick = function(event) {
    const deleteModal = document.getElementById('deleteModal');
    const editModal = document.getElementById('editModal');
    const userMenu = document.getElementById('userMenu');

    if (event.target === deleteModal) {
        deleteModal.style.display = 'none';
        currentNoteToDelete = null;
    }
    if (event.target === editModal) {
        editModal.style.display = 'none';
        currentNoteToEdit = null;
        currentNoteContent = null;
    }
    if (event.target !== document.getElementsByClassName('user-icon')[0]) {
        userMenu.style.display = 'none';
    }
};

// Fetch notes on initial page load
document.addEventListener('DOMContentLoaded', function() {
    // Fetch notes on initial page load
    const userId = sessionStorage.getItem('userId');
    fetch(`http://localhost:3000/notes?user_id=${userId}`)
        .then(response => response.json())
        .then(data => {
            data.forEach(note => {
                displayNote(note.id, note.title, note.content);
            });
        })
        .catch(error => {
            console.error('Error fetching notes:', error);
            showModal('Error occurred while fetching notes.');
        });

    // Set onclick event for saveNote button (inside DOMContentLoaded event)
    const saveNoteButton = document.getElementById('saveNote');
    if (saveNoteButton) {
        saveNoteButton.onclick = function() {
            const noteId = document.getElementById('editModal').dataset.noteId;
            const title = document.getElementById('noteTitle').value;
            const content = document.getElementById('noteContent').value;

            fetch(`http://localhost:3000/notes/${noteId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title, content })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.message === 'Note updated successfully') {
                    const noteElement = document.getElementById(`note-${noteId}`);
                    if (noteElement) {
                        noteElement.querySelector('.note-title').textContent = title;
                        // Update content in currentNoteContent variable, if needed
                        currentNoteContent.textContent = content; // Assuming this updates a global variable
                        closeModal(); // Close edit modal after successful update
                    } else {
                        console.error('Note element not found:', noteId);
                    }
                } else {
                    throw new Error('Unexpected response: ' + JSON.stringify(data));
                }
            })
            .catch(error => {
                console.error('Error updating note:', error);
                showModal('An error occurred while updating the note.');
            });
        };
    } else {
        console.error('Save note button not found');
    }
});

// Function to close modal
function closeModal() {
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.style.display = 'none';
    } else {
        console.error('Edit modal not found');
    }
}

// Function to show modal
function showModal(message) {
    const modalMessage = document.getElementById('modal-message');
    const modal = document.getElementById('messageModal');

    if (modal && modalMessage) {
        modalMessage.innerText = message;
        modal.style.display = 'flex'; // Adjust as per your CSS
    } else {
        console.error('Modal or modal message element not found');
    }
}
