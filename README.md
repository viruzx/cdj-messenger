#CDJ Messenger
CDJ Messenger is an open-source, portable, flexible and *intended to be* a secure messaging platform.

##Objectives

 - Be a replacement for Facebook Messenger
 - Be secure
 - Be easily modifiable

##Dependencies (npm modules) 

 - express
 - http
 - sync-request
 - html-entities
 - orchestrate
 - socket.io
 - fs

#Installation

```
git clone https://viruzx@bitbucket.org/viruzx/cdj-messenger.git
cd cdj-messenger
npm install
```
#Security
The way we proceed to secure the chat is simple. The client requires a username, password and a key which is generated randomly.

Upon connecting, the first thing the client wants to do is send the username, password and key which will be stored in list of a valid keys.

From that point on the client no longer needs to send the password but just the username and the key in order to do anything.
