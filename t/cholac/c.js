const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const readline = require('readline');
const { DateTime } = require('luxon');

class Cholac {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    headers(token) {
        return {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Content-Type": "application/json",
            "Origin": "https://dog-ways.getgems.io",
            "Referer": "https://dog-ways.getgems.io/",
            "Sec-Ch-Ua": '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
            "Sec-Ch-Ua-Mobile": "?1",
            "Sec-Ch-Ua-Platform": '"Android"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-site",
            "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36",
            "X-Auth-Token": token,
            "X-Gg-Client": "v:1 l:en"
        };
    }

    log(msg) {
        console.log(`[*] ${msg}`);
    }

    async waitWithCountdown(endTime) {
        const fiveMinutesInMs = 5 * 60 * 1000;
        const targetTime = new Date(endTime.getTime() + fiveMinutesInMs);
    
        while (new Date() < targetTime) {
            const remainingTime = targetTime - new Date();
            const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remainingTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.round((remainingTime % (1000 * 60)) / 1000);
    
            let waitMessage = '===== Cần chờ ';
            if (days > 0) waitMessage += `${days} ngày `;
            if (hours > 0) waitMessage += `${hours} giờ `;
            if (minutes > 0) waitMessage += `${minutes} phút `;
            waitMessage += `${seconds} giây để tiếp tục vòng lặp =====`;
    
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(waitMessage);
    
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async getLostDogsWayUserInfo(token, value) {
        const url = "https://api.getgems.io/graphql?operationName=lostDogsWayUserInfo&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22a17a9e148547c1c0ab250cca329a3ca237d46b615365dbd217e32aa7c068d10f%22%7D%7D";
        const headers = this.headers(token);
        try {
            const response = await axios.get(url, { headers });
            const data = response.data.data.lostDogsWayUserInfo;
            const woofBalanceDivided = parseFloat(data.woofBalance) / 1e9;
            this.log(`${'WOOF Balance:'.green} ${woofBalanceDivided}`);
            this.log(`${'BONES Balance:'.green} ${data.gameDogsBalance}`);
    
            if (!data.currentRoundVote) {
                await this.lostDogsWayVote(token, value);
            } else {
                this.log(`${'Đã bình chọn thẻ'.green} ${data.currentRoundVote.selectedRoundCardValue} ${'cho'.green} ${data.currentRoundVote.id}`);
                this.log(`${'Số lượng BONES đã bình chọn:'.green} ${data.currentRoundVote.spentGameDogsCount}`);
            }
        } catch (error) {
            this.log(`${'Lỗi khi gọi API:'.red} ${error}`);
        }
    }    

    async getLostDogsWayGameStatus(token) {
        const url = "https://api.getgems.io/graphql?operationName=lostDogsWayGameStatus&variables=%7B%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%22f706c4cd57a87632bd4360b5458e65f854b07e690cf7f8b9f96567fe072148c1%22%7D%7D";
        const headers = this.headers(token);
        try {
            const response = await axios.get(url, { headers });
            const { gameState } = response.data.data.lostDogsWayGameStatus;
    
            const roundEndsAt = new Date(gameState.roundEndsAt * 1000); 
            const gameEndsAt = new Date(gameState.gameEndsAt * 1000);
            const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' };      
            this.log(`${'Game kết thúc:'.green} ${gameEndsAt.toLocaleDateString('vi-VN', options)}`);
            this.log(`${'Vòng mới kết thúc:'.green} ${roundEndsAt.toLocaleDateString('vi-VN', options)}`);
            
            return roundEndsAt;
        } catch (error) {
            this.log(`${'Lỗi khi gọi API:'.red} ${error}`);
            return null;
        }
    }

    async lostDogsWayVote(token, value) {
        if (value === undefined) {
            this.log(`${'Lỗi:'.red} ${'Giá trị không hợp lệ (undefined)'}`);
            return;
        }
    
        const url = "https://api.getgems.io/graphql";
        const headers = this.headers(token);
        const payload = {
            "operationName": "lostDogsWayVote",
            "variables": { "value": value.toString() },
            "extensions": {
                "persistedQuery": {
                    "version": 1,
                    "sha256Hash": "6fc1d24c3d91a69ebf7467ebbed43c8837f3d0057a624cdb371786477c12dc2f"
                }
            }
        };
    
        try {
            const response = await axios.post(url, payload, { headers });
            const data = response.data.data.lostDogsWayVote;
            this.log(`${'Đã bình chọn thẻ'.green} ${data.selectedRoundCardValue} ${'cho'.green} ${data.id}`);
            this.log(`${'Số lượng BONES đã bình chọn:'.green} ${data.spentGameDogsCount}`);
        } catch (error) {
            this.log(`${'Lỗi khi gọi API:'.red} ${error}`);
        }
    }

    async askValue() {
        return new Promise((resolve) => {
            this.rl.question('Bạn muốn mặc định chọn thẻ nào? (1, 2, 3, hoặc 4): ', (answer) => {
                let value;
                switch (answer.trim()) {
                    case '1':
                    case '2':
                    case '3':
                        value = parseInt(answer.trim(), 10);
                        break;
                    case '4':
                        value = 4;
                        break;
                    default:
                        console.log('Lựa chọn không hợp lệ. Giá trị mặc định là 4.');
                        value = 4;
                }
                resolve(value);
                this.rl.close();
            });
        });
    }

    async main() {
        let value = await this.askValue();
        const dataFile = path.join(__dirname, 'data.txt');
        const data = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);

        while (true) {
            let roundEndTime = null;
            for (let i = 0; i < data.length; i++) {
                const token = data[i];
                const user = decodeURIComponent(token.split('&')[0].split('=')[1]);
                const firstname = JSON.parse(user).first_name;
                console.log(`========== Tài khoản ${i + 1} | ${firstname} ==========`.blue);

                let currentValue;
                if (value === 4) {
                    currentValue = (i % 3) + 1;
                } else {
                    currentValue = value;
                }
    
                await this.getLostDogsWayUserInfo(token, currentValue);
                roundEndTime = await this.getLostDogsWayGameStatus(token);
            }
            
            if (roundEndTime) {
                await this.waitWithCountdown(roundEndTime);
            } else {
                await this.waitWithCountdown(new Date(Date.now() + 15 * 60 * 1000));
            }
        }
    }
}

if (require.main === module) {
    const cholac = new Cholac();
    cholac.main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}