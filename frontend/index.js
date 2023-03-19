function pingGateway() {
  const url = 'https://sshmatrix.club:3002/ping';
  fetch(url, {
    method: 'GET'
  })
    .then(response => {
      if (response.ok) {
        response.text().then(text => {
          showModal('Success', text, 'success');
        });
      } else {
        response.text().then(text => {
          showModal(`Error ${response.status}`, text, 'failure');
        });
      }
    })
    .catch(error => {
      showModal('Error', error.message, 'failure');
    });
  }

function showReadme() {
  console.log('Redirecting to README');
}

function showModal(title, message, type) {
  const modalWrapper = document.createElement('div');
  modalWrapper.classList.add('modal-wrapper', type);
  const modal = document.createElement('div');
  modal.classList.add('modal', type);

  const modalContent = document.createElement('div');
  modalContent.classList.add('modal-content', type);

  const modalTitle = document.createElement('h2');
  modalTitle.textContent = title;

  const modalMessage = document.createElement('p');
  modalMessage.textContent = message;

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.classList.add('close-button');
  closeButton.addEventListener('click', () => {
    modal.remove();
  });

  modalContent.appendChild(modalTitle);
  modalContent.appendChild(modalMessage);
  modalContent.appendChild(closeButton);
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
}
