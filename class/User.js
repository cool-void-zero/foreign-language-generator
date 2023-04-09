const Database = require("better-sqlite3");
const path = __dirname + "\\..\\data.sqlite";
const db = new Database(path);

class User{
    constructor({ user_id, username }){
        this.user_id = user_id;
        this.username = username;
        this.default_setting = [
            {
                question: "Your native language: ", 
                setting_column: "native_language", 
            }, 
            {
                question: "Learning foreign language: ", 
                setting_column: "foreign_language", 
            }, 
            {
                question: "Your foreign language level: ", 
                setting_column: "level", 
            }, 
            {
                question: "How many question generate in one time: ", 
                setting_column: "numbers", 
            }
        ];

        //  new user (this user not exist)
        if(!this.exist(this.user_id))
            this.add({ 
                user_id: this.user_id, 
                username: this.username, 
            });
    }

    exist(user_id = this.user_id){
        const result = db.prepare(`SELECT * FROM users where [user_id] = '${user_id}'`).all();

        return result.length;
    }

    add(options = 
        { user_id = this.user_id, username = this.username }
         = 
        { user_id: this.user_id, username: this.username }
    ){
        const create_user = db.prepare(`
            INSERT INTO users([user_id], [username])
            VALUES(@user_id, @username)
        `);
        
        db.transaction(() => create_user.run(options))();

        const create_setting = db.prepare(`
            INSERT INTO users_setting([user_id])
            VALUES(@user_id)
        `);

        db.transaction(() => create_setting.run(options))();
    }

    /**
     *   get specify user setting
     * 
     * @param {int} user_id 
     * @returns {object}
     */
    get_setting(user_id = this.user_id){
        const result = db.prepare(`
            SELECT
                u.[username], u.[nickname], u.[native_language], 
                s.*
            FROM users u
            INNER JOIN users_setting s ON u.[user_id] = s.[user_id]
            WHERE u.[user_id] = ${user_id}
        `).all();
        
        return result[0] || {};
    }

    /**
     *   update specify user setting
     * 
     * @param {int} user_id 
     * @param {object} options 
     */
    update_setting(user_id, options){
        //  default using user_setting, then replace the new setting value (options)
        options = {
            ...this.get_setting(this.user_id), 
            ...options, 
        }

        //  prepare update users
        const update_main = db.prepare(`
            UPDATE users
            SET [username] = @username, [nickname] = @nickname, [native_language] = @native_language
            WHERE [user_id] = @user_id
        `);
        db.transaction(() => update_main.run({
            username: options.username, 
            nickname: options.nickname, 
            native_language: options.native_language, 
            user_id: user_id, 
        }))();

        //  remove some users columns 
        for(let column of ["username", "nickname", "native_language"])
            delete options[column];

        const update_query = `
            UPDATE users_setting
            SET ${ Object.keys(options).map(prop => `[${prop}] = @${[prop]}`).join(", ") }
            WHERE [user_id] = @user_id
        `;
        //  prepare update users_setting
        const update_setting = db.prepare(update_query);
        db.transaction(() => update_setting.run(options))();
        
        //  if languages_levels not exits, insert it
        const insert_query = db.prepare(`
            INSERT OR IGNORE INTO languages_levels ([language], [level])
            VALUES (@language, @level);
        `);
        db.transaction(() => insert_query.run({
            language: options.foreign_language, 
            level: options.level, 
        }))();
    }

    /**
     *  get specify user status (setting mode)
     * 
     * @param {int} user_id 
     * @returns {object}
     */
    get_status(user_id = this.user_id){
        //  result of user status
        const result = db.prepare(`
            SELECT 
                [status] 
            FROM users_setting 
            WHERE [user_id] = ${user_id}
        `).all();
        const status = result[0]['status'] || "";
        let index = 0;

        //  user in setting mode, update index value
        if(status.includes("/setting_"))
            index = parseInt(status.substring(status.indexOf('_') + 1));

        const object = {
            ...this.default_setting[index], 
            index: index, 
        };

        return object;
    }

    /**
     *  update specify user status (command)
     * 
     * @param {int} user_id 
     * @param {string} status 
     */
    update_status(user_id, status){
        const update = db.prepare(`
            UPDATE users_setting
            SET [status] = @status
            WHERE [user_id] = @user_id
        `);

        db.transaction(() => update.run({
            user_id: user_id, 
            status: status, 
        }))();
    }

    /**
     *  insert feedback by user reply to the question 
     * 
     * @param {int} user_id 
     * @param {object} options 
     */
    insert_feedback(user_id, options){
        const insert = db.prepare(`
            INSERT INTO feedbacks(
                [user_id], [generate_time], 
                [native_language], [foreign_language], 
                [question], [user_answer], [gpt_answer], 
                [feedback], [score] 
            )
            VALUES(
                @user_id, @generate_time, 
                @native_language, @foreign_language, 
                @question, @user_answer, @gpt_answer, 
                @feedback, @score
            )
        `);
        
        db.transaction(() => insert.run({
            user_id: user_id, 
            ...options
        }))();
    }
}

module.exports = { User };