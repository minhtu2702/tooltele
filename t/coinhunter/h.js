const fs = require('fs');
const path = require('path');
const axios = require('axios');
const colors = require('colors');
const { DateTime } = require('luxon');
const readline = require('readline');

class Coinhunter {
    log(msg) {
        console.log(`[*] ${msg}`.cyan);
    }

    headers(queryId) {
        return {
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
            "Origin": "https://coinhuntersprod.vercel.app",
            "Referer": "https://coinhuntersprod.vercel.app/",
            "Sec-Ch-Ua": "\"Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"115\", \"Chromium\";v=\"115\"",
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": "\"Windows\"",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "cross-site",
            "Telegram-Data": queryId,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        };
    }

    async getUserData(queryId) {
        const url = "https://europe-central2-coinhuntersprod.cloudfunctions.net/api/user";
        const headers = this.headers(queryId);
        const response = await axios.get(url, { headers });
        return response.data;
    }

    async getEffects(queryId) {
        const url = "https://europe-central2-coinhuntersprod.cloudfunctions.net/api/map/effects";
        const headers = this.headers(queryId);
        const response = await axios.get(url, { headers });
        return response.data;
    }

    async getFarm(queryId) {
        const url = "https://europe-central2-coinhuntersprod.cloudfunctions.net/api/farm";
        const headers = this.headers(queryId);
        const response = await axios.get(url, { headers });
        return response.data;
    }

    async startFarm(queryId, region) {
        const url = "https://europe-central2-coinhuntersprod.cloudfunctions.net/api/farm/start";
        const headers = this.headers(queryId);
        const payload = { region };
        const response = await axios.post(url, payload, { headers });
        return response.data;
    }

    async chooseFarmRegion(queryId) {
        const effectsData = await this.getEffects(queryId);
        if (!effectsData.ok) {
            throw new Error('Unable to fetch effects data');
        }

        const regionsWithEffects = effectsData.result.flatMap(effect => effect.regions);

        const availableRegions = ['survivor-camp', 'supply-barn'].filter(region => !regionsWithEffects.includes(region));
        
        if (availableRegions.length > 0) {
            return availableRegions[Math.floor(Math.random() * availableRegions.length)];
        }

        return 'survivor-camp';  
    }

    async claimFarm(queryId) {
        const url = "https://europe-central2-coinhuntersprod.cloudfunctions.net/api/farm/claim";
        const headers = this.headers(queryId);
        const response = await axios.post(url, {}, { headers });
        return response.data;
    }

    async getBackpack(queryId) {
        const url = "https://europe-central2-coinhuntersprod.cloudfunctions.net/api/backpack";
        const headers = this.headers(queryId);
        const response = await axios.get(url, { headers });
        return response.data;
    }

    async burnItem(queryId, itemId) {
        const url = "https://europe-central2-coinhuntersprod.cloudfunctions.net/api/backpack/burn";
        const headers = this.headers(queryId);
        const payload = { itemId };
        const response = await axios.post(url, payload, { headers });
        return response.data;
    }

    async getConfig(queryId) {
        const url = "https://europe-central2-coinhuntersprod.cloudfunctions.net/api/user/config";
        const headers = this.headers(queryId);
        const response = await axios.get(url, { headers });
        return response.data;
    }

    async getBurnInfo(queryId) {
        const url = "https://europe-central2-coinhuntersprod.cloudfunctions.net/api/backpack/burn-info";
        const headers = this.headers(queryId);
        const response = await axios.get(url, { headers });
        return response.data;
    }

    formatFarmEndTime(startedAt) {
        const startTime = DateTime.fromISO(startedAt);
        const endTime = startTime.plus({ hours: 3 });
        return endTime;
    }

    translateEffect(effectName) {
        const effectMap = {
            rain: 'mưa',
            heat: 'nóng',
            storm: 'bão',
            cold: 'lạnh'
        };
        return effectMap[effectName] || effectName;
    }

    async waitWithCountdown(seconds) {
        for (let i = Math.floor(seconds); i >= 0; i--) {
            readline.cursorTo(process.stdout, 0);
            process.stdout.write(`===== Đã hoàn thành tất cả tài khoản, chờ ${i} giây để tiếp tục vòng lặp =====`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('');
    }

    async main() {
        const dataFile = path.join(__dirname, 'data.txt');
        const initDataList = fs.readFileSync(dataFile, 'utf8')
            .replace(/\r/g, '')
            .split('\n')
            .filter(Boolean);
    
        this.log('Tool được chia sẻ miễn phí tại kênh telegram Dân Cày Airdrop @dancayairdrop !');
    
        while (true) {
            let firstFarmEndTime = null;

            for (let no = 0; no < initDataList.length; no++) {
                const queryId = initDataList[no];
                try {
                    const userData = await this.getUserData(queryId);
                    if (userData.ok) {
                        const result = userData.result;
                        console.log(`========== Tài khoản ${no + 1} | ${result.name} ==========`.green);
                        this.log(`Coins: ${result.coins}`.yellow);
                        this.log(`Power: ${result.power}`.yellow);
                        this.log(`Level: ${result.level}`.yellow);
                        this.log(`Current Region: ${result.currentRegion}`.yellow);
                        this.log(`Weapon: ${result.weapon}`.yellow);

                        const farmData = await this.getFarm(queryId);
                        if (farmData.ok) {
                            const farmResult = farmData.result;
                            if (farmResult) {
                                const farmEndTime = this.formatFarmEndTime(farmResult.startedAt);
                                this.log(`Thời gian hoàn thành farm: ${farmEndTime.toFormat('yyyy-MM-dd HH:mm:ss')}`.magenta);

                                if (!firstFarmEndTime || farmEndTime < firstFarmEndTime) {
                                    firstFarmEndTime = farmEndTime;
                                }

                                if (DateTime.now() > farmEndTime) {
                                    const claimResult = await this.claimFarm(queryId);
                                    if (claimResult.ok) {
                                        this.log(`Claim farm thành công, coins: ${claimResult.result.user.coins}`.cyan);
                                        if (claimResult.result.foundItem) {
                                            const item = claimResult.result.foundItem;
                                            this.log(`Nhặt được item ${item.name} (${item.type}) power ${item.power}`.cyan);
                                        }
                                        const region = await this.chooseFarmRegion(queryId);
                                        const startFarmData = await this.startFarm(queryId, region);
                                        if (startFarmData.ok) {
                                            const newFarmEndTime = this.formatFarmEndTime(startFarmData.result.farm.startedAt);
                                            this.log(`Bắt đầu farm mới tại ${region}. Thời gian hoàn thành farm: ${newFarmEndTime.toFormat('yyyy-MM-dd HH:mm:ss')}`.magenta);
                                            if (!firstFarmEndTime || newFarmEndTime < firstFarmEndTime) {
                                                firstFarmEndTime = newFarmEndTime;
                                            }
                                        } else {
                                            this.log(`Lỗi khi bắt đầu farm mới!`.red);
                                        }
                                    } else {
                                        this.log(`Lỗi khi claim farm cho tài khoản ${no + 1}!`.red);
                                    }
                                }
                            } else {
                                const region = await this.chooseFarmRegion(queryId);
                                const startFarmData = await this.startFarm(queryId, region);
                                if (startFarmData.ok) {
                                    const newFarmEndTime = this.formatFarmEndTime(startFarmData.result.farm.startedAt);
                                    this.log(`Farm mới bắt đầu tại ${region}. Thời gian hoàn thành farm: ${newFarmEndTime.toFormat('yyyy-MM-dd HH:mm:ss')}`.magenta);
                                    if (!firstFarmEndTime || newFarmEndTime < firstFarmEndTime) {
                                        firstFarmEndTime = newFarmEndTime;
                                    }
                                } else {
                                    this.log(`Lỗi khi bắt đầu farm cho tài khoản ${no + 1}!`.red);
                                }
                            }
                        } else {
                            this.log(`Lỗi khi lấy dữ liệu farm cho tài khoản ${no + 1}!`.red);
                        }

                        const effectsData = await this.getEffects(queryId);
                        if (effectsData.ok) {
                            effectsData.result.forEach(effect => {
                                effect.regions.forEach(region => {
                                    this.log(`Đang ${this.translateEffect(effect.name)} trên ${region}`.blue);
                                });
                            });
                        } else {
                            this.log(`Lỗi khi lấy dữ liệu hiệu ứng cho tài khoản ${no + 1}!`.red);
                        }

                        const configData = await this.getConfig(queryId);
                        if (configData.ok) {
                            const maxBurnings = configData.result.maxBurnings;

                            const burnInfo = await this.getBurnInfo(queryId);
                            if (burnInfo.count == null || burnInfo.count < maxBurnings) {
                                const backpackData = await this.getBackpack(queryId);
                                if (backpackData.ok) {
                                    const items = backpackData.result;
                                    items.sort((a, b) => b.power - a.power);
                                    const topTwoItems = items.slice(0, 2);
                                    
                                    for (const item of topTwoItems) {
                                        const burnResult = await this.burnItem(queryId, item.id);
                                        if (burnResult.ok) {
                                            this.log(`Sử dụng item ${item.name} thành công, power mới: ${burnResult.result.power}`.cyan);
                                        } else {
                                            this.log(`Lỗi khi sử dụng item ${item.name}!`.red);
                                        }
                                    }
                                } else {
                                    this.log(`Lỗi khi lấy dữ liệu ba lô cho tài khoản ${no + 1}!`.red);
                                }
                            } else {
                                this.log(`Đã sử dụng tối đa item cho phép ${burnInfo.count}/${maxBurnings}`.red);
                            }
                        } else {
                            this.log(`Lỗi khi lấy dữ liệu cấu hình cho tài khoản ${no + 1}!`.red);
                        }
                    } else {
                        this.log(`Đăng nhập thất bại cho tài khoản ${no + 1}!`.red);
                    }
                } catch (error) {
                    this.log(`Lỗi khi xử lý tài khoản ${no + 1}: ${error.message}`.red);
                }
            }

            if (firstFarmEndTime) {
                const waitTime = firstFarmEndTime.diffNow().as('seconds');
                if (waitTime > 0) {
                    await this.waitWithCountdown(waitTime);
                }
            }
        }
    }
}

if (require.main === module) {
    const coinHunter = new Coinhunter();
    coinHunter.main().catch(err => {
        console.error(colors.red(err));
        process.exit(1);
    });
}