const healthCheck = (req, res) => {
    try {
        res.send('Server is Working!');
    } catch (error) {
        res.status(500).send('Error: ' + error.message);
    }
};

const apiTest = (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Backend API is working!',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error: ' + error.message
        });
    }
};

module.exports = {
    healthCheck,
    apiTest
};
