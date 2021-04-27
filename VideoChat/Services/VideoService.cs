using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

using Twilio;
using Twilio.Base;
using Twilio.Jwt.AccessToken;
using Twilio.Rest.Video.V1;
using Twilio.Rest.Video.V1.Room;
using ParticipantStatus = Twilio.Rest.Video.V1.Room.ParticipantResource.StatusEnum;

using VideoChat.Abstraction;
using VideoChat.Models;
using VideoChat.Options;

namespace VideoChat.Services
{
    public class VideoService : IVideoService
    {
        readonly TwilioSettings _twilioSettings;

        public VideoService(Microsoft.Extensions.Options.IOptions<TwilioSettings> twilioOptions)
        {
            _twilioSettings =
               twilioOptions?.Value
            ?? throw new ArgumentNullException(nameof(twilioOptions));

            TwilioClient.Init(_twilioSettings.ApiKey, _twilioSettings.ApiSecret);
        }

        public string GetTwilioJwt(string identity)
           => new Token(_twilioSettings.AccountSid,
                        _twilioSettings.ApiKey,
                        _twilioSettings.ApiSecret,
                        identity ?? Guid.NewGuid().ToString(),
                        grants: new HashSet<IGrant> { new VideoGrant() }).ToJwt();

        public async Task<IEnumerable<RoomDetails>> GetAllRoomsAsync(string roomSid = null)
        {
            var rooms = await RoomResource.ReadAsync();
            if (roomSid != null)
            {
                var tasks = rooms.Where(x => x.Sid == roomSid).Select(
                    room => GetRoomDetailsAsync(
                        room,
                        ParticipantResource.ReadAsync(
                            room.Sid,
                            ParticipantStatus.Connected)));
                return await Task.WhenAll(tasks);
            }
            else
            {
                var tasks = rooms.Select(
                    room => GetRoomDetailsAsync(
                        room,
                        ParticipantResource.ReadAsync(
                            room.Sid,
                            ParticipantStatus.Connected)));

                return await Task.WhenAll(tasks);
            }
            //Note that for every room n that exists, GetRoomDetailsAsync is invoked to fetch the room’s connected participants. This can be a performance concern! Even though this is done asynchronously and in parallel, it should be considered a potential bottleneck and marked for refactoring. It isn't a concern in this demo project, as there are, at most, a few rooms.
            async Task<RoomDetails> GetRoomDetailsAsync(
                RoomResource room,
                Task<ResourceSet<ParticipantResource>> participantTask)
            {
                var participants = await participantTask;
                return new RoomDetails
                {
                    Id = room.Sid,
                    Name = room.UniqueName,
                    MaxParticipants = room.MaxParticipants ?? 0,
                    ParticipantCount = participants.ToList().Count
                };
            }
        }
    }
}
