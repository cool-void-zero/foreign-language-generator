const Database = require("better-sqlite3");
const db = new Database("data.sqlite");

db.exec(`
    CREATE TABLE IF NOT EXISTS [users](
        [user_id] INTEGER PRIMARY KEY NOT NULL, 
        [username] TEXT NOT NULL, 
        [nickname] TEXT DEFAULT '', 
        [native_language] TEXT DEFAULT 'English'
    );
    
    CREATE TABLE IF NOT EXISTS [users_setting]( 
        [user_id] INTEGER PRIMARY KEY NOT NULL REFERENCES users([user_id]), 
        [status] TEXT DEFAULT '/setting', 
        [foreign_language] TEXT DEFAULT 'English', 
        [level] TEXT DEFAULT 'A1', 
        [topic] TEXT DEFAULT 'mix', 
        [type] TEXT DEFAULT 'radio', 
        [numbers] INTEGER DEFAULT 5, 
        [daily_challenge] TEXT DEFAULT '09', 
        [max_review] INTEGER DEFAULT 10
    );
    
    CREATE TABLE IF NOT EXISTS [feedbacks]( 
        [feedback_id] INTEGER PRIMARY KEY AUTOINCREMENT, 
        [user_id] INTEGER REFERENCES users([user_id]), 
        [generate_time] TEXT, 
        [native_language] TEXT DEFAULT 'English', 
        [foreign_language] TEXT DEFAULT 'English', 
        [question] TEXT NOT NULL, 
        [user_answer] TEXT, 
        [gpt_answer] TEXT, 
        [feedback] TEXT, 
        [score] REAL
    );
    
    CREATE TABLE IF NOT EXISTS [languages_levels](
        [language] TEXT NOT NULL, 
        [level] TEXT NOT NULL, 
        PRIMARY KEY([language], [level])
    );
`);

const insertLLV = db.prepare(`INSERT INTO languages_levels([language], [level]) VALUES(@language, @level)`);
const arr = [
    { language: 'English', level: 'A1' }, 
    { language: 'English', level: 'A2' }, 
    { language: 'English', level: 'B1' }, 
    { language: 'English', level: 'B2' }, 
    { language: 'English', level: 'C1' }, 
    { language: 'English', level: 'C2' }
];

db.transaction(() => {
    for(const obj of arr) insertLLV.run(obj);
})();

const result = db.prepare('SELECT * FROM languages_levels').all();
console.log(result);
