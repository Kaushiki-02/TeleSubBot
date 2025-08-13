
from telethon.sync import TelegramClient

# Initialize the Telegram client
client = TelegramClient('test', 21379589, "dea66cda0b5f1c6494326f6790787b23")
client.connect()

# Function to fetch and list group members
async def list_members():
    # Start the client
    await client.start()

    # Replace with your target group's username or invite link
    group_username = 'https://t.me/+jQfz_Pax_yIzYmY1'

    # Get the group entity (channel or group)
    group = await client.get_entity(group_username)

    # Fetch the list of participants
    participants = await client.get_participants(group)

    # Print details of members
    print(f'Members of the group {group.title}:')
    for user in participants:
        print(f'{user.id} - {user.username} - {user.first_name} {user.last_name}')

    # Disconnect after fetching the members
    await client.disconnect()

# Run the function in an event loop
with client:
    client.loop.run_until_complete(list_members())
