//DbListener.js// --Created by Florian Lepage 10/31/2020

// lib imports
const {Database} = require("../database/Database.js");
const {MessageEmbed} = require("discord.js");

class DbListener{
    constructor(config, language, client) {
        this.config = config;
        this.language = language.DbListener;
        this.client = client;
        this.db = new Database(config);
    }

    dcPermissionGrant(user) {
        let discordMember = this.client.users.cache.get(user.user_id);
        let discordChannel = this.client.channels.cache.get(user.channel_id);
        let channelBasePermissions = []

        discordChannel.permissionOverwrites.each(fn => channelBasePermissions.push(fn))

        channelBasePermissions.push({
                id: discordMember.id,
                allow: [
                    "VIEW_CHANNEL",
                    "SEND_MESSAGES",
                    "ADD_REACTIONS",
                    "ATTACH_FILES",
                    "EMBED_LINKS"
                ]
        });

        discordChannel.overwritePermissions(channelBasePermissions, `Permission granted for ${discordMember.tag}.`).then(channel => {
            channel.send(`${discordMember}, You just bought an access here! thanks and welcome.`).then(message => {
                message.delete({timeout: 10000});
                discordMember.send(
                    this.embed(1, [
                        discordMember,
                        discordChannel
                    ])
                ).then().catch(console.error);
            }).catch(console.error);
        }).catch(console.error);
    }

    purchased() {
        setInterval(() => {
            this.db.connection().query(`SELECT * FROM dc_purchased_users`, (err, rows) => {
                if(err) throw err;
                let purchased_users = rows;

                this.db.connection().query(`SELECT * FROM dc_allowed_users`, (err, rows) => {
                    if(err) throw err;
                    let allowed_users = rows;
                    for(let i = 0; purchased_users.length > i; i++) {
                        let userDict = allowed_users.find(rn => rn.user_id === purchased_users[i].user_id && rn.channel_id === purchased_users[i].channel_id);

                        if(typeof userDict === "undefined") {
                            this.db.connection().query(`INSERT INTO dc_allowed_users (user_id, time, channel_id) VALUES ("${purchased_users[i].user_id}", "${Date.now() + parseInt(purchased_users[i].time)}", "${purchased_users[i].channel_id}")`, (err) => {
                                if(err) throw err;
                                this.dcPermissionGrant(purchased_users[i]);
                            });
                        }
                    }
                });
            });
        }, 20000);
    }

    renewal() {
        setInterval(() => {
            this.db.connection().query(`SELECT * FROM dc_allowed_users`, (err, rows) => {
                if(err) throw err;
                if(rows.length >= 1) {
                    for(let i = 0; rows.length > i; i++) {
                        if(Date.now() > parseInt(rows[i].time)) {
                            let discordMember = this.client.users.cache.get(rows[i].user_id);
                            let discordChannel = this.client.channels.cache.get(rows[i].channel_id);

                            this.db.connection().query(`DELETE FROM dc_allowed_users WHERE user_id = "${rows[i].user_id}" AND channel_id = "${rows[i].channel_id}"`, (err) => {
                                if(err) throw err;
                                discordChannel.updateOverwrite(discordMember.id, {
                                    VIEW_CHANNEL: false,
                                    SEND_MESSAGES: false,
                                    ADD_REACTIONS: false,
                                    ATTACH_FILES: false,
                                    EMBED_LINKS: false
                                }).then(channel => {
                                    discordMember.send(
                                        this.embed(5, [
                                            discordMember,
                                            discordChannel
                                        ])
                                    ).then().catch(console.error);
                                }).catch(console.error)
                            });
                        }
                    }
                }
            });
        }, 3600000)
    }
    embed(Case, info) {
        switch (Case) {
            case 1:
                return new MessageEmbed()
                    .setAuthor(this.client.user.username, this.client.user.avatarURL())
                    .setThumbnail(info[0].avatarURL() !== null ? info[0].avatarURL() : "https://i.imgur.com/BxPrsg4.png")
                    .setDescription(`Hey ${info[0]}, you just purchased the premium plan from our website!`)
                    .addFields(
                        {
                            name: "Channel Access:",
                            value: info[1],
                            inline: true
                        },
                        {
                            name: '\u200b',
                            value: '\u200b',
                            inline: true,
                        },
                        {
                            name: "Duration:",
                            value: "30 days",
                            inline: true
                        }
                    )
                    .setTimestamp()
                    .setColor("RED")
            case 2:
                return new MessageEmbed()
                    .setAuthor(this.client.user.username, this.client.user.avatarURL())
                    .setThumbnail(info[0].avatarURL() !== null ? info[0].avatarURL() : "https://i.imgur.com/BxPrsg4.png")
                    .setDescription(`Hey ${info[0]},  Your membership just expire!`)
                    .addFields(
                        {
                            name: "Channel Concerned:",
                            value: info[1],
                            inline: true
                        },
                        {
                            name: '\u200b',
                            value: '\u200b',
                            inline: true,
                        },
                        {
                            name: "Get in Back:",
                            value: "`" + this.config.discord.prefix + "store" + "`" + "\nIn the discord sever you want!",
                            inline: true
                        },
                    )
                    .setTimestamp()
                    .setColor("BLACK")
            case 3:
                return new MessageEmbed()
                    .setAuthor(this.client.user.username, this.client.user.avatarURL())
                    .setThumbnail(info[0].avatarURL() !== null ? info[0].avatarURL() : "https://i.imgur.com/BxPrsg4.png")
                    .setDescription(`Hey ${info[0]},  Your membership just will expire un 1 day!`)
                    .setTimestamp()
                    .setColor("BLACK")
        }
    }
}
module.exports = {
    DbListener
}
