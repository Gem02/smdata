const Message = require('../models/Message');
const validator = require('validator')

// Create a new message
const createMessage = async (req, res) => {
  try {
    const { message } = req.body;

    
    if (!message) {
      return res.status(400).json({ status: false, message: 'Message is required' });
    }
    const mainMessage = validator.escape(message)

    const newMessage = new Message({
      message: mainMessage
    });

    await newMessage.save();

    res.status(201).json({
      message: 'Message created successfully',
      data: newMessage
    });

  } catch (error) {
    console.error('Error in createMessage controller:', error);
    res.status(500).json({
      message: 'Failed to create message',
    });
  }
};

// Get all messages
const getMessage = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 }); // Fixed variable name

    if (messages.length === 0) { // Fixed condition - check if array is empty
        return res.status(404).json({status: false, message: "No messages found"})
    }

    res.status(200).json({
      status: true,
      data: messages // Fixed response structure
    });

  } catch (error) {
    console.error('Error in getMessages controller:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to retrieve message',
    });
  }
};

// Update message
const updateMessage = async (req, res) => {
  try {
    const { newMessage, messageId } = req.body;
    console.log("messageId is", messageId, "newMessage is", newMessage)
    
    // FIXED: Changed || to && in condition
    if (!newMessage || !messageId) {
      return res.status(400).json({ // Changed to 400 Bad Request
        status: false,
        message: 'Message content and Message ID are required'
      });
    }

    // Find and update message - Added {new: true} to return updated document
    const updatedMessage = await Message.findByIdAndUpdate(
      messageId, 
      { message: newMessage },
      { new: true } // This returns the updated document
    );

    if (!updatedMessage) {
      return res.status(404).json({
        status: false,
        message: 'Message not found'
      });
    }

    res.status(200).json({
      status: true,
      message: 'Message updated successfully', // Added success message
      data: updatedMessage // Fixed variable name
    });

  } catch (error) {
    console.error('Error in updateMessage controller:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to update message',
    });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.messageId
    console.log("messageId is", messageId)
    console.log("the body is", req.body)
    
    // FIXED: Added validation for messageId
    if (!messageId) {
      return res.status(400).json({
        status: false,
        message: 'Message ID is required'
      });
    }

    const deletedMessage = await Message.findByIdAndDelete(messageId);

    if (!deletedMessage) {
      return res.status(404).json({
        status: false,
        message: 'Message not found'
      });
    }

    res.status(200).json({
      status: true,
      message: 'Message deleted successfully',
    });

  } catch (error) {
    console.error('Error in deleteMessage controller:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to delete message',
    });
  }
};

module.exports = {
  createMessage,
  getMessage,
  updateMessage,
  deleteMessage
};