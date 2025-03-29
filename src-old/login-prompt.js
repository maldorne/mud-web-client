var LoginPrompt = function (o) {
  var user,
    line,
    pastuser = 0;
  var id = (o.id = o.id || '#login-prompt');
  var pass = null;
  o['class'] = 'login-prompt';

  if (Config.kong) {
    var kong_id = param('kongregate_user_id');
    var kong_token = param('kongregate_game_auth_token');
    pass = kong_token;
  }

  log('LoginPrompt.init: gmcp is ' + o.gmcp);

  if (j('#login-prompt').length) {
    o.replace = 0;
    log('forcing replace mode off');
  }

  try {
    if (!o.gmcp) {
      o.show = new RegExp(o.show);
      o.err = new RegExp(o.error);
      delete o.error;
    }

    o.dismiss = new RegExp(o.dismiss);
    o.password = new RegExp(o.password);
  } catch (ex) {
    log(ex);
  }

  console.log(o);

  var shown = function () {
    return j('.modal.login-prompt').length;
  };

  var listen = function (d) {
    if (!d) return d;

    if ((line = d.match(o.show))) {
      log('LoginPrompt listen show');

      if (Config.kong) {
        Config.socket.write(kong_id);
        return d.replace(line, '');
      }

      if (param('token')) Config.socket.write(param('token'));
      else show(line[0]);
    } else if ((line = d.match(o.err))) {
      log('LoginPrompt listen error');
      j(id + ' .error')
        .html(line[0])
        .show();
      return d;
    } else if (pass && d.match(o.password)) {
      log('LoginPrompt password prompt detected');
      pastuser = 1;

      if (Config.kong) {
        Config.socket.write(pass);
        return '';
      }

      Config.socket.write(pass);
      return d;
    } else if (shown() && d.match(o.dismiss)) {
      log('LoginPrompt dismiss detected');
      j('.modal').modal('hide');
      setTimeout(function () {
        j('#scroll-view .send').focus();
      }, 500);
    } else if (
      Config.kong &&
      d.has('Username available. Would you like to create')
    ) {
      Config.socket.write('y;' + kong_token + ';' + kong_token);
      return '';
    } else if (Config.kong && d.has('Give me a password for')) {
      return '';
    } else if (Config.kong && d.has('Please retype password')) {
      return '';
    }

    return d;
  };

  var go = function () {
    log('LoginPrompt.go');

    if (!j(id + ' .user').val()) {
      j(id + ' .error')
        .html('You need to enter a ' + o.placeholder + '.')
        .show();
      return;
    }

    if (!param('havoc') && !j(id + ' .pass').val()) {
      j(id + ' .error')
        .html('You need to enter a password.')
        .show();
      return;
    }

    j(id + ' .error').hide();

    user = j(id + ' .user').val();
    pass = j(id + ' .pass').val();

    if (pastuser) Config.socket.write(pass);
    else if (o.gmcp) {
      if (pass)
        Config.socket.write(
          stringify({
            username: user,
            password: pass,
          }),
        );
      else Config.socket.write(user);
    } else Config.socket.write(user);
  };

  var show = function (t) {
    var note = '';

    if (!o.gmcp) note = '<div class="error alert" style="display:none"></div>';

    o.html =
      '\
		<div id="' +
      id.split('#')[1] +
      '" class="login-prompt" style="width: 100%">\
			<div style="width: 100%; margin-top: 24px;">\
			' +
      note +
      '\
			<div class="left" style="margin: 0px; opacity: 0.6; padding: 0px 40px 0px 0px">\
				<img style="width: 90px;" src="/app/images/login.png"></div>\
				<div class="left" style="width: 200px">\
					<form id="havoc-login-prompt" action="havoc/login">\
					<input name="username" class="user right" type="text" tabindex="1" autocapitalize="off" autocorrect="off" size=18 placeholder="' +
      (o.placeholder || '') +
      '">\
					<br><br>\
					<input name="password" class="pass right" type="password" tabindex="2" autocapitalize="off" autocorrect="off" size=18 placeholder="password">\
					</form>\
				</div>\
			</div>\
		</div>';

    o.title = t || o.title || 'Please Login:';

    o.closeable = o.closeable || 0;

    o.buttons = [
      {
        text: '<i class="icon-signin"></i> Login',
        keep: 1,
        click: go,
      },
    ];

    if (
      window.user.guest &&
      !Config.device.touch &&
      !Config.kong &&
      !param('gui') &&
      !param('havoc')
    )
      o.buttons.unshift({
        text: '<i class="icon-sun"></i> Portal Sign-In',
        click: function () {
          window.open('/component/comprofiler/login', '_self');
        },
      });

    o.css = o.css || {
      width: 400,
    };

    var onOpen = function () {
      j(id + ' .user')
        .focus()
        .on('keydown', function (e) {
          if (e.which == 13) {
            if (!param('havoc') && !j(id + ' .pass').val().length)
              j(id + ' .pass').focus();
            else go(e);
            e.preventDefault();
          }
        });

      j(id + ' .pass').on('keydown', function (e) {
        if (e.which == 13) {
          go(e);
          e.preventDefault();
        }
      });
    };

    var onClose = function () {
      j(id + ' .user').off('keydown');
      j(id + ' .pass').off('keydown');
    };

    j('body').on('shown.bs.modal', onOpen);
    j('body').on('hide.bs.modal', onClose);

    new Modal(o);
  };

  if (o.gmcp) show();

  return {
    listen: listen,
  };
};

Event.listen('gmcp', function (d) {
  if (!d) return d;

  if (!d.start || !d.start('LoginPrompt')) return d;

  log('LoginPrompt detected gmcp trigger');

  try {
    var o = JSON.parse(d.match(/^[^ ]+ (.*)/)[1]);
    o.gmcp = 1;
    new LoginPrompt(o);
  } catch (ex) {
    log(ex);
  }

  return d;
});
