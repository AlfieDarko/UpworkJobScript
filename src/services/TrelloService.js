const axios = require('axios');
const { config } = require('../config/config');

class TrelloService {
    constructor() {
        this.apiKey = config.trello.apiKey;
        this.token = config.trello.token;
        this.boardId = config.trello.boardId;
        this.lists = config.trello.lists;
        this.listOrder = ['quickWins', 'mediumProjects', 'highValue'];
    }

    async initializeBoard() {
        try {
            // Get all lists on the board
            const url = `https://api.trello.com/1/boards/${this.boardId}/lists?key=${this.apiKey}&token=${this.token}`;
            const response = await axios.get(url);
            const existingLists = response.data;

            // Create lists if they don't exist
            for (const [listName, listId] of Object.entries(this.lists)) {
                if (!listId) {
                    const newList = await this.createList(listName);
                    this.lists[listName] = newList.id;
                }
            }

            // Reorder lists according to our preferred order
            await this.reorderLists(existingLists);
        } catch (error) {
            console.error('Error initializing board:', error.response ? error.response.data : error.message);
        }
    }

    async createList(name) {
        const url = `https://api.trello.com/1/lists?key=${this.apiKey}&token=${this.token}`;
        const data = {
            name: this.formatListName(name),
            idBoard: this.boardId,
            pos: 'bottom'
        };

        try {
            const response = await axios.post(url, data);
            return response.data;
        } catch (error) {
            console.error(`Error creating list ${name}:`, error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async reorderLists(existingLists) {
        // Create a map of list names to their current positions
        const listPositions = existingLists.reduce((acc, list) => {
            acc[list.name.toLowerCase()] = list.pos;
            return acc;
        }, {});

        // Update list positions according to our preferred order
        for (let i = 0; i < this.listOrder.length; i++) {
            const listName = this.listOrder[i];
            const listId = this.lists[listName];
            const currentPos = listPositions[listName.toLowerCase()];

            if (currentPos !== i) {
                await this.updateListPosition(listId, i);
            }
        }
    }

    async updateListPosition(listId, position) {
        const url = `https://api.trello.com/1/lists/${listId}?key=${this.apiKey}&token=${this.token}`;
        const data = { pos: position };

        try {
            await axios.put(url, data);
        } catch (error) {
            console.error(`Error updating list position:`, error.response ? error.response.data : error.message);
        }
    }

    formatListName(name) {
        return name
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .trim();
    }

    async addCard(job, { category, priority }) {
        const url = `https://api.trello.com/1/cards?key=${this.apiKey}&token=${this.token}`;
        const data = {
            idList: this.lists[category],
            ...job.toTrelloCard(),
            pos: 'top' // Always add new cards to the top of the list
        };

        try {
            const response = await axios.post(url, data);
            return response.status === 200;
        } catch (error) {
            console.error("Error adding to Trello:", error.response ? error.response.data : error.message);
            return false;
        }
    }

    async archiveOldCards() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - config.storage.cleanupDays);
        
        try {
            const url = `https://api.trello.com/1/boards/${this.boardId}/cards?key=${this.apiKey}&token=${this.token}`;
            const response = await axios.get(url);
            const cards = response.data;

            const cardsToArchive = cards.filter(card => {
                const cardDate = new Date(card.dateLastActivity);
                return cardDate < cutoffDate && !card.closed;
            });

            if (cardsToArchive.length === 0) {
                console.log('No cards to archive');
                return;
            }

            console.log(`Found ${cardsToArchive.length} cards to archive`);

            const BATCH_SIZE = 10;
            for (let i = 0; i < cardsToArchive.length; i += BATCH_SIZE) {
                const batch = cardsToArchive.slice(i, i + BATCH_SIZE);
                const archivePromises = batch.map(card => {
                    const archiveUrl = `https://api.trello.com/1/cards/${card.id}?key=${this.apiKey}&token=${this.token}`;
                    return axios.put(archiveUrl, { closed: true })
                        .then(() => {
                            console.log(`Archived card: ${card.name}`);
                            return true;
                        })
                        .catch(error => {
                            console.error(`Failed to archive card ${card.name}:`, error.response ? error.response.data : error.message);
                            return false;
                        });
                });

                await Promise.all(archivePromises);
                
                if (i + BATCH_SIZE < cardsToArchive.length) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            console.log(`Completed archiving ${cardsToArchive.length} cards`);
        } catch (error) {
            console.error('Error during card archiving:', error.response ? error.response.data : error.message);
        }
    }
}

module.exports = TrelloService; 