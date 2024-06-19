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
        socket.on("connect", ()=>{
            // alert("socket connected to client side")
            if(socket.connected){
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