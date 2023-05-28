function pingGateway() {
  const url = 'https://sshmatrix.club:3002/ping';
  fetch(url, {
    method: 'GET'
  })
    .then(response => {
      console.log(response.ok);
      console.log(response.status);
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
      if (error.name === 'TypeError') {
        showModal('🥳🎉💯', 'CCIP Gateway is alive', 'success');
      } else {
        showModal('❌😬😶', error.message, 'failure');
      }
    });
  }

function showFaq() {
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
  closeButton.textContent = 'Ok, Bye 👋';
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

function getQuery(key) {
  var query = window.location.search.substring(1);
  var key_values = query.split("&");
  var params = {};
  key_values.map(function (key_val) {
      var key_val_arr = key_val.split("=");
      params[key_val_arr[0]] = key_val_arr[1];
  });
  if (typeof params[key] != "undefined") {
      return params[key];
  }
  return "";
}

window.onload = function () {
  md = document.createElement("zero-md")
  md.setAttribute("src", getQuery("src"))
  md.setAttribute("no-shadow", "")
  document.getElementById("mdcontainer").append(md)
  document.getElementById("pingGateway").addEventListener("click", pingGateway);
}
