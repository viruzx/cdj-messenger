#CDJ Messenger

CDJ Messenger is an open-source, portable, flexible and *intended to be* a secure messaging platform based on orchestrate.io's database service. Please don't fork this to Github, ~~we don't like github~~ **project abandonned, I don't care anymore**.

>Our development process is now lead by bot development since it is our best way to figure out what is missing in our interface to make everything work smoothly. This means however, that basic UI is pushed back in favor of bot and core development. ~~ viruzx

##Objectives

 - Be a replacement for Facebook Messenger
 - Be secure
 - Be easily modifiable

##Dependencies (npm modules)

 - express
 - node-imgur
 - orchestrate
 - socket.io

## Pre-requisits

 - Have 3 collections in your orchestrate application (CaSe SeNsItIvE!!): users, messages, Threads

#Installation

```
git clone https://viruzx@bitbucket.org/viruzx/cdj-messenger.git
cd cdj-messenger
npm install

#With node
node index.js orchestrate_api_key

#With supervisor
supervisor -- index.js orchestrate_api_key
```
#Security
The way we proceed to secure the chat is simple. The client requires a username, password and a key which is generated randomly for each initial connection.

Upon connecting, the first thing the client wants to do is send the username, password and key which will be stored in list of a valid keys associated with the socket's id.

From that point on the client no longer needs to send the password but just the username and the key in order to do anything. Once the client disconnects, that key is terminated.

SSL is heavily recommended!

#In Development
 - Sticky Threads
 - Android app

#Planned

 - Forum Redesign
 - Media Sharing (via filesharing sites, similar approach as we use imgur to handle all of our image needs. We will need to find however, a free unlimited file sharing service.)
 - Fetch categories from database instead of hardcode
 - Desktop notifications

#NOT Planned

 - iOS/Apple app
 - Private messaging

#In consideration

 - Windows app
 - Linux app
