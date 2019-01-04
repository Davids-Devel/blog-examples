const {
	createReadStream,
	unlinkSync,
	existsSync,
	mkdirSync
} = require("fs");


require('es6-promise').polyfill();
const fetch = require("isomorphic-fetch");

const {google} = require("googleapis");

const OAuth2 = google.auth.OAuth2;
const youtube = google.youtube("v3");

const client_id = "";
const client_secret = "";

class UploadYoutubeVideo {
	constructor(){
		this.access_token;
		this.refresh_token;
		this.oauth2Client;
		this.initializeOAuth2();
	}
	static getRefreshToken(code) {
		return new Promise(async (resolve, reject) => {
			try{
				//Auth URL
				let dataToSend = `code=${code}&client_id=${client_id}&client_secret=${client_secret}&redirect_uri=http%3A%2F%2Flocalhost:3000%2FauthSuccess&grant_type=authorization_code`;
				
				let response = await fetch("https://accounts.google.com/o/oauth2/token",{
					method:"POST",
					body:dataToSend,
					headers:{
						"Content-Type": "application/x-www-form-urlencoded"
					}
				});
				let data = await response.json();

				let {refresh_token} = data;

				if (!existsSync("temp")) {
					mkdirSync("temp"); //Temp Folder
				}
				resolve(refresh_token);
			} catch(err) {
				reject(err);
			}
		})
	}
	static getAccessToken(refresh_token) {
		return new Promise(async (resolve, reject) => {
			try {
				let response = await fetch("https://www.googleapis.com/oauth2/v4/token", {
					method:"POST",
					headers:{
						"Content-Type":"application/x-www-form-urlencoded"
					},
					body:`client_id=${client_id}&client_secret=${client_secret}&refresh_token=${refresh_token}&grant_type=refresh_token`
				});
				let data = await response.json();
				let {access_token} = data;
				resolve(access_token);
			} catch(err) {
				reject(err);
			}
		})
		
	}
	initializeOAuth2(){
		this.oauth2Client = new OAuth2(
			client_id,
			client_secret
		);
	}
	setAccessRefreshToken(access_token, refresh_token){
		this.access_token = access_token;
		this.refresh_token = refresh_token;
		this._setOAuthCredentials();
	}
	_setOAuthCredentials(){
		this.oauth2Client.setCredentials({
			access_token:this.access_token,
			refresh_token:this.refresh_token
		})
		this._setGoogleOptions();
	}
	_setGoogleOptions(){
		google.options({auth:this.oauth2Client}, (err, res)=>{
			if (err) throw err;
		})
	}
	uploadVideo(title, description, isPublic, videoPath){
		return new Promise((resolve, reject) => {
			youtube.videos.insert({
				part: 'status,snippet',
				resource: {
					snippet: {
						title,
						description
					},
					status: { 
						privacyStatus: isPublic ? 'public' : 'private'
					}
				},
				media: {
					body: createReadStream(videoPath)
				}
			}, (err, data) => {
				if (err) {
					reject("upload-error");
					unlinkSync(videoPath);
				}else {
					let videoData = data.data
					console.log(videoData);
					unlinkSync(videoPath);
					resolve("success")
				}
			})
		})
	}
}
module.exports = UploadYoutubeVideo;
