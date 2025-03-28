import jQuery from 'jquery';
import { Event } from './event.js';
// import { Modal } from './modal.js';
import { config } from './config.js';
import { log, stringify, param } from './utils.js';
// import { height } from '@fortawesome/free-regular-svg-icons/faAddressBook';
import { Modal as BootstrapModal } from 'bootstrap';

const j = jQuery;

export class LoginPrompt {
  constructor(options = {}) {
    this.user = null;
    this.line = null;
    this.pastuser = false;
    this.id = options.id || '#login-prompt';
    this.pass = null;

    options.class = 'login-prompt';

    // Handle Kongregate integration
    if (config.kong) {
      const kongId = param('kongregate_user_id');
      const kongToken = param('kongregate_game_auth_token');
      this.pass = kongToken;
    }

    log('LoginPrompt.init: gmcp is ' + options.gmcp);

    if (j('#login-prompt').length) {
      options.replace = false;
      log('forcing replace mode off');
    }

    try {
      if (!options.gmcp) {
        options.show = new RegExp(options.show);
        options.err = new RegExp(options.error);
        delete options.error;
      }

      options.dismiss = new RegExp(options.dismiss);
      options.password = new RegExp(options.password);
    } catch (error) {
      log(error);
    }

    log(options);

    this.options = options;

    if (options.gmcp) {
      this.show();
    }

    return {
      listen: (data) => this.listen(data),
    };
  }

  initialize(title) {
    const o = this.options;
    // const note = !o.gmcp
    //   ? '<div class="error alert" style="display:none"></div>'
    //   : '';

    // Remove existing modals
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
      const modal = BootstrapModal.getInstance(existingModal);
      if (modal) modal.hide();
    }

    const modalTemplate = `
      <div class="modal ${o.class} fade" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">${title || o.title || 'Please Login:'}</h5>
              ${o.closeable ? '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' : ''}
            </div>
            <div class="modal-body">
              <div class="error alert alert-danger" style="display:none"></div>
              <div style="width: 100%; margin-top: 24px;">
                <div class="left" style="margin: 0px; opacity: 0.6; padding: 0px 40px 0px 0px">
                  <img style="width: 90px;" src="/app/images/login.png">
                </div>
                <div class="left" style="width: 200px">
                  <form id="havoc-login-prompt" action="havoc/login">
                    <input name="username" class="user right" type="text" tabindex="1" 
                           autocapitalize="off" autocorrect="off" size="18" 
                           placeholder="${o.placeholder || ''}">
                    <br><br>
                    <input name="password" class="pass right" type="password" tabindex="2"
                           autocapitalize="off" autocorrect="off" size="18" 
                           placeholder="password">
                  </form>
                </div>
              </div>
            </div>
            <div class="modal-footer"></div>
          </div>
        </div>
      </div>
    `;

    j('body').append(modalTemplate);

    this.setupButtons();
    this.setupEventListeners();

    // Initialize Bootstrap modal
    const modalEl = document.querySelector('.modal');
    this.modalInstance = new BootstrapModal(modalEl, {
      backdrop: 'static',
      keyboard: true,
    });

    if (o.css) {
      if (o.css.width) {
        o.css['margin-left'] = -(o.css.width / 2);
      }
      j('.modal').css(o.css);
    }

    this.modalInstance.show();
  }

  setupButtons() {
    const o = this.options;
    const buttons = [
      {
        text: '<i class="icon-signin"></i> Login',
        keep: true,
        'data-role': 'submit',
        handler: () => this.handleSubmit(),
      },
      {
        text: '<i class="icon-remove"></i> Cancel',
        'data-role': 'cancel',
        handler: () => {
          log('LoginPrompt cancel');
          this.modalInstance.hide();
        },
      },
    ];

    if (
      window.user?.guest &&
      !config.device.touch &&
      !config.kong &&
      !param('gui') &&
      !param('havoc')
    ) {
      buttons.unshift({
        text: '<i class="icon-sun"></i> Portal Sign-In',
        handler: () => {
          window.open('/component/comprofiler/login', '_self');
        },
      });
    }

    buttons.forEach((button, index) => {
      const buttonEl = `
        <button class="btn btn-secondary kbutton custom-${index}">
          ${button.text}
        </button>
      `;
      j('.modal-footer').append(buttonEl);

      if (button.handler) {
        j(`.modal-footer .custom-${index}`).on('click', (e) => {
          e.preventDefault();
          button.handler();
          if (!button.keep) {
            this.modalInstance.hide();
          }
        });
      }
    });
  }

  setupEventListeners() {
    j(`${this.id} .user`)
      .focus()
      .on('keydown', (e) => {
        if (e.key === 'Enter') {
          if (!param('havoc') && !j(`${this.id} .pass`).val().length) {
            j(`${this.id} .pass`).focus();
          } else {
            this.handleSubmit();
          }
          e.preventDefault();
        }
      });

    j(`${this.id} .pass`).on('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleSubmit();
        e.preventDefault();
      }
    });

    // Clean up on hide
    j('.modal').on('hide.bs.modal', () => {
      j(`${this.id} .user`).off('keydown');
      j(`${this.id} .pass`).off('keydown');
    });
  }

  isShown() {
    return j('.modal.login-prompt').length;
  }

  listen(data) {
    if (!data) return data;

    if ((this.line = data.match(this.options.show))) {
      log('LoginPrompt listen show');

      if (config.kong) {
        config.socket.write(param('kongregate_user_id'));
        return data.replace(this.line, '');
      }

      if (param('token')) {
        config.socket.write(param('token'));
      } else {
        this.show(this.line[0]);
      }
    } else if ((this.line = data.match(this.options.err))) {
      log('LoginPrompt listen error');
      j(`${this.id} .error`).html(this.line[0]).show();
      return data;
    } else if (this.pass && data.match(this.options.password)) {
      log('LoginPrompt password prompt detected');
      this.pastuser = true;

      if (config.kong) {
        config.socket.write(this.pass);
        return '';
      }

      config.socket.write(this.pass);
      return data;
    } else if (this.isShown() && data.match(this.options.dismiss)) {
      log('LoginPrompt dismiss detected');
      j('.modal').modal('hide');
      setTimeout(() => {
        j('#scroll-view .send').focus();
      }, 500);
    } else if (config.kong) {
      if (data.includes('Username available. Would you like to create')) {
        config.socket.write(`y;${this.pass};${this.pass}`);
        return '';
      } else if (data.includes('Give me a password for')) {
        return '';
      } else if (data.includes('Please retype password')) {
        return '';
      }
    }

    return data;
  }

  handleSubmit() {
    log('LoginPrompt.go');

    const userInput = j('.modal .user').val();
    const passInput = j('.modal .pass').val();

    if (!userInput) {
      j('.modal .error')
        .html(`You need to enter a ${this.options.placeholder}.`)
        .show();
      return;
    }

    if (!param('havoc') && !passInput) {
      j('.modal .error').html('You need to enter a password.').show();
      return;
    }

    j('.modal .error').hide();

    this.user = userInput;
    this.pass = passInput;

    if (this.pastuser) {
      config.socket.write(this.pass);
    } else if (this.options.gmcp) {
      if (this.pass) {
        config.socket.write(
          stringify({
            username: this.user,
            password: this.pass,
          }),
        );
      } else {
        config.socket.write(this.user);
      }
    } else {
      config.socket.write(this.user);
    }

    // Close the modal after sending credentials
    this.modalInstance.hide();
  }

  show(title) {
    this.initialize(title);
  }
}

// Setup GMCP event listener
Event.listen('gmcp', (data) => {
  if (!data || !data.startsWith('LoginPrompt')) return data;

  log('LoginPrompt detected gmcp trigger');

  try {
    const options = JSON.parse(data.match(/^[^ ]+ (.*)/)[1]);
    options.gmcp = true;
    new LoginPrompt(options);
  } catch (error) {
    log(error);
  }

  return data;
});
