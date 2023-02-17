const MESSAGES_EN = {
    ERR_INVALID_ROOM_OPTIONS: 'Invalid room options!',
    ERR_ROOM_NAME_REQUIRED: 'You must enter a room name to begin!',
    ERR_ROOM_NAME_TOO_SHORT: 'Room name must be at least 4 characters long.',
    ERR_MUST_BE_TEACHER: 'Students cannot create rooms!',
    ERR_ROOM_NOT_SET_UP: 'The teacher has not finished setting up the room!',
    ERR_INCORRECT_ROOM_NAME: 'Incorrect room name!',
    ERR_NO_PERMISSION: "Only a teacher can do this action.",
    ERR_UNKNOWN: 'An unknown error occurred. Please reload the page.',
    ERR_USERNAME_TOO_SHORT: 'Your username must be at least 4 characters in length.',
    ERR_USERNAME_IN_USE: 'Username already in use.',
    ERR_USERNAME_REQUIRED: 'You must enter a username to begin!',
    DISCONNECTED: 'Disconnected!',
    DISCONNECTED_TEXT: 'Your teacher has disconnected. Please <a href="/">click here</a> to reload the page.',
    KICKED: 'Kicked out!',
    KICKED_TEXT: 'You were kicked out of the room by the teacher. Please <a href="/">click here</a> to reload the page.',
};
const MESSAGES_JA = {
    ERR_ROOM_NAME_REQUIRED: '部屋の名前を入力する必要があります!',
    ERR_ROOM_NAME_TOO_SHORT: '部屋の名前は4文字以上でなければなりません。',
    ERR_MUST_BE_TEACHER: '学生はルームを作成できません!',
    ERR_ROOM_NOT_SET_UP: '先生が部屋のセッティングを終えていません!',
    ERR_INCORRECT_ROOM_NAME: '部屋の名前が正しくありません!',
    ERR_NO_PERMISSION: 'このアクションができるのは先生だけです。',
    ERR_UNKNOWN: '不明なエラーが発生しました。ページを再読み込みしてください。',
    ERR_USERNAME_TOO_SHORT: 'ユーザー名は4文字以上でなければなりません!',
    ERR_USERNAME_IN_USE: 'ユーザーネームはすでに使用中です。',
    ERR_USERNAME_REQUIRED: '開始するにはユーザー名を入力する必要があります!',
    DISCONNECTED: '切断されました!',
    DISCONNECTED_TEXT: '先生が切断しました。ページを再読み込みするには<a href="/">こちらをクリック</a>してください。',
    KICKED: '部屋から出されした！',
    KICKED_TEXT: 'あなたは先生によって部屋から出されした。ページを再読み込みするには、<a href="/">こちらをクリック</a>してください。',
};

module.exports = {
    default: MESSAGES_EN,
    jpn: MESSAGES_JA
};