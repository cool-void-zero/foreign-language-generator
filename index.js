/*
    Todo list
    -----------------------------------------------------------------------------

    [√] get config.json build-up setting
    [√] generate question
    [√] gpt response with JSON
    [√] check answer and feedback
    [√] translate template prompt from Chinese to English
    [√] build sqlite table
    
    -----------------------------------------------------------------------------

    [] Telegram user can custom setting 
        (native language, foreign language, default: question number, topic, type)
    [] Telegram custom command
    [] setting fixed schedule send questions to user (receive) for daily practice

*/

const { Setting } = require("./class/Setting");
const { LanguageBot } = require("./class/LanguageBot");

const setting = new Setting({
    project_root: __dirname, 
    config_path: "config.json", 
});
const bot = new LanguageBot({
    ...setting.config, 
});

setInterval(() => bot.daily_challenge(), 10 * 1000);

console.log(`Your Telegram Bot running...`);