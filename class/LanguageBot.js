const TelegramBot = require('node-telegram-bot-api');
//	custom class
const { QuestionGenerator } = require("./QuestionGenerator");
const { User } = require("./User");

class LanguageBot{
    //  get default generate parameters value
    getDefaultGenerate({
        native_language = "English",
        foreign_language = "English", 
        level = "B1", 
        topic = "general",
        type = "radio", 
        //  number of questions
        numbers = 5, 
    } = {
        native_language: "English",
        foreign_language: "English", 
        level: "B1", 
        topic: "general",
        type: "radio", 
        numbers: 5, 
    }){
        return {
            native_language: native_language,
            foreign_language: foreign_language, 
            level: level, 
            topic: topic,
            type: type, 
            numbers: numbers, 
        };
    }

    constructor({
        openai_api_key, telegram_token, template, 
    }){
        this.generator = new QuestionGenerator(openai_api_key, template);
        this.bot = new TelegramBot(telegram_token, { polling: true });
        this.template = template;
        //  Temporary for storage users generate question
        this.queue = new Map();

        this.bot.on('message', (user_msg) => {
            //  user message or command
            const user_id = user_msg.chat.id;
            const username = user_msg.chat.username;
            let user_cmd = user_msg.text.toLocaleLowerCase();
            //  get user setting or status (instantiate current user)
            let user = new User({ 
                user_id: user_id, 
                username: username, 
            });
            let user_setting = user.get_setting(user_id);
            
            try {
                //  user still in setting mode
                if(!user_cmd.includes('/') && user_setting.status.includes('/setting_')){
                    //  length of the setting mode
                    const setting_len = user.default_setting.length;
                    //  setting_column = need to update value of setting column
                    const { setting_column, index } = user.get_status(user_id);
                    let options = { ...user_setting };
                    
                    options[setting_column] = user_cmd;
                    options.status = ((index + 1) >= setting_len)? 
                        '': '/setting_' + (index + 1);
                    
                    //  update the user setting
                    user.update_setting(user_id, options);

                    //  complete setting
                    if((index + 1) >= setting_len){
                        user.update_status(user_id, '');
                        this.bot.sendMessage(user_id, "Complete setting.");
                    }
                    else{
                        const { question } = user.get_status();
                        this.bot.sendMessage(user_id, question);
                    }
                }
                //  user reply the question
                else if(!user_cmd.includes('/') && user_setting.status.includes('/generate')){ 
                    if(!this.queue.has(user_id))
                        this.bot.sendMessage(user_id, `You need to generate your question first.`);
                    else{
                        const answer = user_cmd;
                        const question = this.queue.get(user_id);

                        this.generator.solution({
                            native_language: user_setting.native_language, 
                            foreign_language: user_setting.foreign_language, 
                            question: question, 
                            answer: answer, 
                        })
                        .then(json => {
                            const reply_msg = this.buildFeedback(json);
                            this.bot.sendMessage(user_id, reply_msg);
                            
                            if(json.data.length){
                                //  insert feedbacks into database
                                const generate_time = new Date().toISOString();
                                for(let feedback of json.data){
                                    const options = {
                                        ...feedback, 
                                        user_id: user_id, 
                                        generate_time: generate_time, 
                                        native_language: user_setting.native_language, 
                                        foreign_language: user_setting.foreign_language, 
                                    }

                                    console.log(`[feedback options]`);
                                    console.log(options);

                                    user.insert_feedback(user_id, options);
                                }
                            }
                            
                            user.update_status(user_id, user_cmd);
                        });
                    }
                }
                //  user start the setting mode
                else if(user_cmd.includes('/start') || user_cmd.includes('/setting')){
                    user.update_status(user_id, '/setting_0');

                    const { question } = user.get_status(user_id);
                    this.bot.sendMessage(user_id, question);
                }
                else if(user_cmd.includes('/generate')){
                    this.generator.generate(user_setting)
                        .then(question => {
                            this.queue.set(user_id, question);

                            this.bot.sendMessage(user_id, question);
                            user.update_status(user_id, user_cmd);
                        })
                        .catch(err => {
                            //  custom to user, error message
                            const err_msg = `Fail to call OpenAI GPT API for generate, with "${user_cmd}" command.`;
                            console.error(err);
                            console.log(err_msg);

                            this.bot.sendMessage(user_id, err_msg);
                        });
                }
            }
            catch(err){
                console.error(err);
                console.log(`command error`);
            }
        });
    }

    buildFeedback(json = {
        data: [], 
        total_question: 0, 
    }){
        if(json.data.length === 0) return "Fail to call API or parse json string.";

        const { data, total_question } = json;
        //  build the feedback reply message
        let reply_msg = "";
        let arr_score = [];
        
        //  count total score and fetch feedback
        for(let i=0; i<data.length; i++){
            reply_msg += `${i+1}) ${data[i]['gpt_answer']}\n(${data[i]['feedback']})\n`;
            arr_score.push(data[i]['score']);
        }

        //  count the total score
        const total_score = (arr_score.reduce((acc, cur) => acc + cur, 0) || 0) / total_question;
        const total_score_str = (total_score * 100).toFixed(2) + " %";

        // reply_msg += `\n---------------------------${total_score_str} / 100.00 %`;
        reply_msg += `\n\n${total_score_str} (for reference only)`;

        return reply_msg;
    }

    //  config template, replace parameters to value
    //  ex: ${level} → B1
    configTemplate(template = this.template.generate, options = this.getDefaultGenerate()){
        for(let prop in options){
            let regexp = new RegExp("\\${" + prop + "}", "gi");
            
            template = template.replace(regexp, options[prop]);
        }
        
        return template;
    }

    //  send the daily challenge to user
    daily_challenge(chat_id = 0, options = this.getDefaultGenerate()){
        // let template = this.configTemplate();
        
        this.generator.generate(options)
            .then(generate => {
                
                this.bot.sendMessage(chat_id, generate);
            });
    }
}

module.exports = { LanguageBot };