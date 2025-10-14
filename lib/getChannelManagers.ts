import "dotenv/config"

export default async function getChannelManagers(channelId: string): Promise<string[]> {
    const myHeaders = new Headers();
    myHeaders.append("Cookie", `d=${process.env.XOXD}`);

    const formData = new FormData();
    formData.append("token", process.env.XOXC);
    formData.append("entity_id", channelId);

    const request = await fetch(
        "https://slack.com/api/admin.roles.entity.listAssignments",
        {
            method: "POST",
            headers: myHeaders,
            body: formData,
            redirect: "follow",
        },
    );

    const json = await request.json() as { ok: boolean, role_assignments: { users: string[] }[] };

    if (!json.ok) return [];
    return json.role_assignments[0]?.users || [];
}