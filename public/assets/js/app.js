var AppProcess=(function(){
    var peers_connection_ids = [];
    var peers_connection = [];
    var remote_vid_stream = [];
    var remote_aud_stream = [];
    var serverProcess;
    var local_div;
    var audio;
    var isAudioMute = true;
    var rtp_aud_senders;

    async function _init(SDP_function, my_connid){
        serverProcess = SDP_function;
        my_connection_id = my_connid;
        eventProcess();
        local_div = document.getElementById("localVideoPlayer");
    }

    function eventProcess(){
        $("#miceMuteUnmute").on("click", async function(){
            if(!audio){
                await loadAudio();
            }
            if(!audio){
                alert("Audio permission hasnot granted");
                return;
            }
            if(isAudioMute){
                audio.enabled = true;
                $(this).html("<span class='material-icons'>mic</span>");
                updateMediaSenders(audio, rtp_aud_senders);
            }else{
                audio.enabled = false;
                $(this).html("<span class='material-icons'>mic_off</span>");
                removeMediaSenders(rtp_aud_senders);
            }
            isAudioMute = !isAudioMute;
        })
    }

    var iceConfiguration = {
        iceServers:[
            {
                urls: "stun:stun.l.google.com:19302",
            },
            {
                urls: "stun:stun1.l.google.com:19302",
            },
        ]
    }

    async function setConnection(connid){
        var connection = new RTCPeerConnection(iceConfiguration)

        connection.onnegotiationneeded = async function(event) {
            await setOffer(connid);
        }
        connection.onicecandidate = function(event){
            if(event.candidate){
                serverProcess(JSON.stringify({icecandidate:event.candidate}),connid)
            }
        }
        connection.ontrack=function(event){
            if(!remote_vid_stream[connid]){
                remote_vid_stream[connid] = new MediaStream();
            }
            if(!remote_aud_stream[connid]){
                remote_aud_stream[connid] = new MediaStream();
            }

            if(event.track.kind == "video"){
                remote_vid_stream[connid]
                .getVideoTracks()
                .forEach((t)=>remote_vid_stream[connId].removeTrack(t));
                remote_vid_stream[connid].addTrack(event.track);
                var remoteVideoPlayer = document.getElementById("v_"+connid);
                remoteVideoPlayer.srcObject = null;
                remoteVideoPlayer.srcObject = remote_vid_stream[connid];
                remoteVideoPlayer.load();
            }else if(event.track.kind = "audio"){
                remote_aud_stream[connid]
                .getAudioTracks()
                .forEach((t)=>remote_aud_stream[connId].removeTrack(t));
                remote_aud_stream[connid].addTrack(event.track);
                var remoteAudioPlayer = document.getElementById("a_"+connid);
                remoteAudioPlayer.srcObject = null;
                remoteAudioPlayer.srcObject = remote_aud_stream[connid];
                remoteAudioPlayer.load();
            }
        }
        peers_connection_ids[connid] = connid;
        peers_connection[connid] = connection;

        return connection;
    }

    async function setOffer(connid){
        var connection = peers_connection[connid];
        var offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        serverProcess(JSON.stringify({
            offer: connection.localDescription,
        }), connid)
    }
     async function SDPProcess(message, from_connid){
        message = JSON.parse(message);
        if(message.answer){
            await setConnection(from_connid);
        }else if(message.offer){
            if(!peers_connection[from_connid]){
                await setConnection(from_connid);
            }
            await peers_connection[from_connid].setRemoteDescription(new RTCSessionDescription(message.offer))
            var answer = await peers_connection[from_connid].createAnswer();
            await peers_connection[from_connid].setLocalDescription(answer);
            serverProcess(JSON.stringify({
                answer: answer,
            }), from_connid)
        }else if(message.icecandidate){
            if(!peers_connection[from_connid]){
                await setConnection(from_connid);
            }
            try {
                await peers_connection[from_connid].addIcecandidate(message.icecandidate);
            } catch (error) {
                console.log(error);
            }
        }
    }

    return {
        setNewConnection: async function(connid){
            await setConnection(connid);
        },
        init: async function(SDP_function, my_connid){
           await _init(SDP_function, my_connid);
        },
        processClientFunc: async function(data, from_connid){
            await SDPProcess(data, from_connid);
         },
    }
})();

var MyApp = (function(){
    var socket = null;
    var user_id="";
    var meeting_id="";
    function init(uid, mid){
        user_id = uid;
        meeting_id=mid;
        event_process_for_signaling_server();
    }
    function event_process_for_signaling_server(){
        socket = io.connect();

        var SDP_function = function(data, to_connid){
            socket.emit("SDPProcess", {
                message:data,
                to_connid:to_connid
            })
        }

        socket.on("connect", ()=>{
            // alert("socket connected to client side")
            if(socket.connected){
                AppProcess.init(SDP_function, socket.id);
                if(user_id!="" && meeting_id!=""){
                    socket.emit("userconnect",{
                        displayName: user_id,
                        meetingId: meeting_id
                    })
                }
            }
        })

        socket.on("inform_others_about_me", function(data){
            addUser(data.other_user_id, data.connId);
            AppProcess.setNewConnection(data.connId)
        });

        socket.on("inform_me_about_other_user", function(other_users){
            if(other_users){
                for (var index = 0; index < other_users.length; index++) {
                    addUser(other_users[i].user_id, other_users[i].connectionId);
                    AppProcess.setNewConnection(other_users[i].connectionId);
                }
            }
        });

        socket.on("SDPProcess", async function(data){
            await AppProcess.processClientFunc(data.message, data.from_connid);
        })
    }
    // add User and set connection
    function addUser(other_user_id, connId){
        var newDivId = $("#otherTemplate").clone();
        newDivId = newDivId.attr("id", connId).addClass("other");
        newDivId.find("h2").text(other_user_id);
        newDivId.find("video").attr("id", "v_"+connId);
        newDivId.find("audio").attr("id", "a_"+connId);
        newDivId.show();
        $("#divUsers").append(newDivId);       

    }

    return {
        _init: function(uid, mid){
            init(uid, mid);
        }
    }
})();