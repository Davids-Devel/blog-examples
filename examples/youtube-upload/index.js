//Server Const
const express = require("express");
const app = express();
const fileUpload = require('express-fileupload');

//Native Modules
const {
	existsSync,
	writeFileSync,
	readFileSync
} = require("fs");
const {join} = require("path");
	
//API
const {UploadVideo} = require("./lib");
	
//Env
const PORT = process.env.PORT || 3000;
const public = join(__dirname, "public");

//Middlewares
app
	.use(express.static(public))
	.use(fileUpload());

app
	.get("/",(req, res) => {
		if (existsSync(join(__dirname, "temp", "refresh-token.txt"))){
			res.redirect(302, "/upload");
		} 
		else res.sendFile("index.html");
	})
	.get("/upload",(req, res) => {
		if (existsSync(join(__dirname, "temp", "refresh-token.txt"))){
			res.sendFile("upload.html", {
				root:"public"
			});
		} 
		else res.status(401).send("Usuario No Autorizado");
	})
	.get("/authSuccess", async ({query}, res)=>{
		//Auth Route
		try {
			let {code} = query; //Google Account Code
			let refresh_token = await UploadVideo.getRefreshToken(code); //Account Refresh Token
			
			if (!refresh_token) res.status(401).send("Error");
			else {
				//Save Refresh Token then redirect to upload route
				writeFileSync("temp/refresh-token.txt", refresh_token);
				res.redirect(302, "/upload");
			}
		} catch(err) {
			throw err;
			res.status(500).send(err);
		}
	})
	.post('/upload-video', (req,res) => {

		let {file} = req.files; //Get File
		var {title, description, public} = req.body; //Get Title and Description

		//Get Video Mimetype
		let mime;
		switch (file.mimetype) {
			case "video/mp4":
				mime = ".mp4";
				break;
			case "video/3gpp":
				mime = ".3gp";
				break;
			case "video/x-msvideo":
				mime = ".avi";
				break;
			default:
				mime = ".mp4";
				break;
		}
		var videoPath = join(__dirname, "temp", "video"+mime);
		file.mv(videoPath, async ()=>{
			try{
				let fileBuffer = readFileSync(join(__dirname, "temp", "refresh-token.txt"));
				let refresh_token = Buffer.from(fileBuffer).toString();

				let access_token = await UploadVideo.getAccessToken(refresh_token);
				
				if (!access_token) res.status(401).send("Error");
				else {
				
					let Upload = new UploadVideo();

					Upload.setAccessRefreshToken(access_token, refresh_token);
				
					//Upload Video
					let status = await Upload.uploadVideo(title, description, public, videoPath);
				
					res.json({
						status
					});
				}
			} catch(err) {
				res.status(500).json({
					status:err
				});
			}
		});
	})
	.listen(PORT, () => console.log("App preparada y escuchando en el puerto: " + PORT));
