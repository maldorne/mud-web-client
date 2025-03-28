import { config } from './config.js';
import { Event } from './event.js';
import { log, param } from './utils.js';

export class TriggerHappy {
  constructor(options) {
    this.host = config.host;
    this.port = config.port;
    this.triggers = [];
    this.gTriggers = [];
    this.pTriggers = [];

    const { sitelist: games, profiles } = window.user.pref;

    this.init(games, profiles);
  }

  init(games, profiles) {
    this.setupFirstTimeEvents();

    if (!config.triggers) {
      log('Triggers disabled by official code.');
      return;
    }

    this.loadGameTriggers(games);
    this.loadProfileTriggers(profiles);
    this.compileTriggers();
    this.notifyTriggerCount();
  }

  setupFirstTimeEvents() {
    if (!config.onfirst) return;

    Event.listen('before_process', (data) => {
      if (!config.onfirst) return data;

      const commands = config.onfirst.split(';');

      if (commands.length > 1 && data.includes(commands[0])) {
        commands.slice(1).forEach((command, index) => {
          setTimeout(
            () => {
              config.socket.write(`${command}\r\n`);
              config.socket.echo('\n');
            },
            (index + 1) * 600,
          );
        });

        log('sending onfirst text');
        delete config.onfirst;
      }

      return data;
    });
  }

  loadGameTriggers(games) {
    const game = Object.values(games).find((g) => g.host === this.host);

    if (game) {
      this.gTriggers = game.triggers || [];
    }
  }

  loadProfileTriggers(profiles) {
    const profileName = param('profile');
    if (profiles?.[profileName]) {
      this.pTriggers = profiles[profileName].triggers || [];
    }
  }

  compileTriggers() {
    this.triggers = [
      ...this.gTriggers.filter((trigger) => trigger[2]),
      ...this.pTriggers.filter((trigger) => trigger[2]),
    ];

    this.triggers.forEach((trigger) => {
      try {
        // Add compiled regex as fourth element of trigger array
        trigger[3] = new RegExp(
          trigger[0].replace(/\$[0-9]/g, '([A-Za-z0-9-\'"]+)'),
          'g',
        );
      } catch (error) {
        log(`Error compiling trigger regex: ${error}`);
      }
    });
  }

  notifyTriggerCount() {
    const totalAvailable = this.gTriggers.length + this.pTriggers.length;
    const activeCount = this.triggers.length;

    config.socket.echo(`Loaded ${activeCount}/${totalAvailable} triggers.`);
  }

  respond(message) {
    if (!config.triggers) return message;

    for (const trigger of this.triggers) {
      const [pattern, command, enabled, regex] = trigger;
      const match = regex.exec(message);

      if (!match?.length) return;

      let processedCommand = command;

      if (match.length > 1) {
        // Replace wildcards with captured groups
        match.slice(1).forEach((capture, index) => {
          processedCommand = processedCommand.replace(
            `$${index + 1}`,
            capture,
            'g',
          );
        });
      }

      config.socket.send(processedCommand);
    }

    return message;
  }

  // static create(options) {
  //   const triggerHandler = new TriggerHappy(options);
  //   return {
  //     init: (games, profiles) => triggerHandler.init(games, profiles),
  //     respond: (message) => triggerHandler.respond(message)
  //   };
  // }
}
