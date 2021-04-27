using Microsoft.AspNetCore.SignalR;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace VideoChat.Hubs
{
    public class NotificationHub : Hub
    {
        public async Task RoomsUpdated(string roomCode, bool flag)
            => await Clients.Others.SendAsync("RoomsUpdated", roomCode, flag);

        public async Task RoomUpdated(string roomCode, bool flag)
            => await Clients.OthersInGroup(roomCode).SendAsync("RoomUpdated", flag);

        public async Task JoinRoom(string roomCode)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);

            //Notify others that you have joined the room.
            await RoomUpdated(roomCode, true);
        }

        public async Task LeaveRoom(string roomName)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomName);
        }
    }
}
