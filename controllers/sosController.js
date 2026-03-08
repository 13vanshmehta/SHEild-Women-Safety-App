const SOSAlert = require('../models/sosAlert');
const EmergencyContact = require('../models/emergencyContact');
const Group = require('../models/group');
const User = require('../models/user');
const twilioService = require('../services/twilioService');

// Trigger SOS Alert
exports.triggerSOS = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      location,
      deviceInfo,
      triggerMode = 'manual_button'
    } = req.body;

    // Validate required fields - handle 0 properly
    if (!location || location.latitude === undefined || location.longitude === undefined || location.latitude === null || location.longitude === null) {
      return res.status(400).json({
        success: false,
        message: 'Location is required to trigger SOS'
      });
    }

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has at least 2 emergency contacts
    const emergencyContacts = await EmergencyContact.find({
      userId,
      isActive: true
    }).sort({ emergencyPriority: -1 });

    if (emergencyContacts.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'You must add at least 2 emergency contacts before triggering SOS',
        contactCount: emergencyContacts.length
      });
    }

    // Create SOS Alert
    const sosAlert = new SOSAlert({
      userId,
      userName: `${user.firstName} ${user.lastName}`,
      userPhone: user.phoneNumber || 'Not provided',
      triggerTime: new Date(),
      triggerMode,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || '',
        accuracy: location.accuracy || 0
      },
      deviceInfo: {
        batteryLevel: deviceInfo?.batteryLevel || 0,
        networkStatus: deviceInfo?.networkStatus || 'unknown',
        deviceModel: deviceInfo?.deviceModel || '',
        osVersion: deviceInfo?.osVersion || ''
      },
      status: 'triggered'
    });

    await sosAlert.save();

    console.log('🚨 SOS Alert created, starting to send notifications...');

    // Send notifications synchronously to ensure they're sent before responding
    try {
      await sendSOSNotifications(sosAlert._id, user, emergencyContacts, location, deviceInfo, triggerMode);

      // Reload the alert to get updated notification count
      const updatedAlert = await SOSAlert.findById(sosAlert._id);
      const emergencyContactsSent = updatedAlert.notificationsSent.filter(n => n.recipientType === 'emergency_contact').length;
      const groupsSent = updatedAlert.notificationsSent.filter(n => n.recipientType === 'group').length;
      const totalNotifications = updatedAlert.notificationsSent.length;

      console.log(`✅ SOS Alert completed. Contacts: ${emergencyContactsSent}, Groups: ${groupsSent}, Total: ${totalNotifications}`);

      return res.status(200).json({
        success: true,
        message: 'SOS Alert triggered successfully',
        alertId: sosAlert._id,
        notificationsSent: totalNotifications,
        emergencyContactsSent,
        groupsSent
      });
    } catch (notificationError) {
      console.error('❌ Error sending notifications:', notificationError);

      return res.status(200).json({
        success: true,
        message: 'SOS Alert triggered but some notifications may have failed',
        alertId: sosAlert._id,
        notificationsSent: 0,
        emergencyContactsSent: 0,
        groupsSent: 0,
        warning: 'Some notifications failed to send'
      });
    }

  } catch (error) {
    console.error('❌ Error triggering SOS:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger SOS alert',
      error: error.message
    });
  }
};

// Send SOS notifications to emergency contacts and groups
async function sendSOSNotifications(alertId, user, emergencyContacts, location, deviceInfo, triggerMode = 'manual_button') {
  console.log('\n🚨 ═══════════════════════════════════════');
  console.log('🚨 STARTING SOS NOTIFICATION PROCESS');
  console.log('🚨 ═══════════════════════════════════════\n');

  console.log(`📋 Alert ID: ${alertId}`);
  console.log(`👤 User: ${user.firstName} ${user.lastName}`);
  console.log(`📞 User Phone: ${user.phoneNumber || 'Not provided'}`);
  console.log(`📍 Location: ${location.latitude}, ${location.longitude}`);
  console.log(`🔋 Battery: ${deviceInfo?.batteryLevel || 0}%`);
  console.log(`📶 Network: ${deviceInfo?.networkStatus || 'unknown'}`);
  console.log(`📱 Emergency Contacts: ${emergencyContacts.length}`);
  console.log('');

  try {
    const sosAlert = await SOSAlert.findById(alertId);
    if (!sosAlert) {
      console.error('❌ SOS Alert not found in database!');
      throw new Error('SOS Alert not found');
    }

    const userName = `${user.firstName} ${user.lastName}`;
    const userPhone = user.phoneNumber || 'Not provided';
    const googleMapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

    // Get address from coordinates if not provided
    let address = location.address || '';
    if (!address || address.trim() === '') {
      try {
        // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
        const fetch = require('node-fetch');
        const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}&zoom=18&addressdetails=1`;

        const response = await fetch(geocodeUrl, {
          headers: {
            'User-Agent': 'SHEild-Safety-App/1.0'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.display_name) {
            address = data.display_name;
            console.log(`📍 Address resolved: ${address}`);
          } else {
            address = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
          }
        } else {
          address = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
        }
      } catch (error) {
        console.log(`⚠️  Could not resolve address: ${error.message}`);
        address = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
      }
    }

    // Format trigger mode for display
    const triggerModeMap = {
      'manual_button': 'Tapped SOS Button in App',
      'voice_detection': 'Voice Detection',
      'voice_keyword': 'Voice Command (Keyword)',
      'fall_detection': 'Fall Detection',
      'shake_detection': 'Shaked Phone',
      'long_press': 'Long Pressed Button',
      'double_press': 'Double Pressed Button'
    };
    const triggerMethod = triggerModeMap[triggerMode] || 'SOS Button';

    // Create SHORT SMS message (to avoid carrier blocking)
    const smsMessage = `EMERGENCY SOS ALERT!
${userName} needs help!
Triggered: ${triggerMethod}
Location: ${googleMapsLink}
Check WhatsApp for details.`;

    // Create FULL WhatsApp message
    const whatsappMessage = `🚨 EMERGENCY SOS ALERT 🚨

${userName} needs immediate help!

📱 Phone: ${userPhone}
⏰ Time: ${new Date().toLocaleString()}
🚨 Triggered: ${triggerMethod}
📍 Location: ${address}
🔋 Battery: ${deviceInfo?.batteryLevel || 0}%
📶 Network: ${deviceInfo?.networkStatus || 'unknown'}

Please respond immediately!

Location: ${googleMapsLink}`;

    console.log('📝 SMS Message (Short):');
    console.log('─────────────────────────────────────');
    console.log(smsMessage);
    console.log('─────────────────────────────────────\n');

    console.log('📝 WhatsApp Message (Full):');
    console.log('─────────────────────────────────────');
    console.log(whatsappMessage);
    console.log('─────────────────────────────────────\n');

    // ═══════════════════════════════════════
    // STEP 1: Send to Emergency Contacts
    // ═══════════════════════════════════════
    console.log('📱 STEP 1: Sending to Emergency Contacts\n');

    let emergencyContactsSuccess = 0;
    let emergencyContactsFailed = 0;

    for (let i = 0; i < emergencyContacts.length; i++) {
      const contact = emergencyContacts[i];
      console.log(`\n👤 Contact ${i + 1}/${emergencyContacts.length}: ${contact.name}`);
      console.log(`   Phone: ${contact.phoneNumber}`);

      const notification = {
        recipientType: 'emergency_contact',
        recipientId: contact._id,
        recipientName: contact.name,
        recipientPhone: contact.phoneNumber,
        smsStatus: 'pending',
        whatsappStatus: 'pending',
        sentAt: new Date()
      };

      let contactSuccess = false;

      // Send SMS (independent - don't stop if fails)
      console.log(`   📱 Sending SMS...`);
      try {
        const smsResult = await twilioService.sendSMS(contact.phoneNumber, smsMessage);

        if (smsResult.success) {
          notification.smsStatus = 'sent';
          notification.smsSid = smsResult.sid;
          console.log(`   ✅ SMS SENT! SID: ${smsResult.sid}`);
          contactSuccess = true;
        } else {
          notification.smsStatus = 'failed';
          notification.error = smsResult.error;
          console.log(`   ❌ SMS FAILED: ${smsResult.error}`);
        }
      } catch (smsError) {
        notification.smsStatus = 'failed';
        notification.error = smsError.message;
        console.log(`   ❌ SMS ERROR: ${smsError.message}`);
      }

      // Send WhatsApp (independent - don't stop if fails)
      console.log(`   💬 Sending WhatsApp...`);
      try {
        const whatsappResult = await twilioService.sendWhatsApp(contact.phoneNumber, whatsappMessage);

        if (whatsappResult.success) {
          notification.whatsappStatus = 'sent';
          notification.whatsappSid = whatsappResult.sid;
          console.log(`   ✅ WHATSAPP SENT! SID: ${whatsappResult.sid}`);
          contactSuccess = true;
        } else {
          notification.whatsappStatus = 'failed';
          if (!notification.error) notification.error = whatsappResult.error;
          console.log(`   ❌ WHATSAPP FAILED: ${whatsappResult.error}`);
        }
      } catch (whatsappError) {
        notification.whatsappStatus = 'failed';
        if (!notification.error) notification.error = whatsappError.message;
        console.log(`   ❌ WHATSAPP ERROR: ${whatsappError.message}`);
      }

      // Track success/failure
      if (contactSuccess) {
        emergencyContactsSuccess++;
      } else {
        emergencyContactsFailed++;
      }

      sosAlert.notificationsSent.push(notification);

      // Update last contacted (even if failed)
      try {
        contact.lastContacted = new Date();
        await contact.save();
      } catch (saveError) {
        console.log(`   ⚠️  Could not update last contacted: ${saveError.message}`);
      }
    }

    console.log(`\n✅ Emergency contacts processed: ${emergencyContacts.length}`);
    console.log(`   Success: ${emergencyContactsSuccess}, Failed: ${emergencyContactsFailed}\n`);

    // ═══════════════════════════════════════
    // STEP 2: Send to Trust Circle Groups (IN-APP ONLY)
    // ═══════════════════════════════════════
    console.log('👥 STEP 2: Sending to Trust Circle Groups (In-App Messages)\n');

    const userGroups = await Group.find({
      'members.user': user._id,
      'members.isActive': true,
      isActive: true
    });

    console.log(`   Found ${userGroups.length} groups\n`);

    const GroupMessage = require('../models/groupMessage');

    let groupsSuccess = 0;
    let groupsFailed = 0;

    for (let i = 0; i < userGroups.length; i++) {
      const group = userGroups[i];
      console.log(`\n📢 Group ${i + 1}/${userGroups.length}: ${group.name}`);

      // Create in-app message in the group chat (independent - don't stop if one fails)
      try {
        const groupMessage = new GroupMessage({
          groupId: group._id,
          senderId: user._id,
          senderName: userName,
          messageType: 'text',
          content: {
            text: whatsappMessage // Already contains the heading, no need to duplicate
          }
        });

        await groupMessage.save();
        console.log(`   ✅ In-app message saved to group chat`);

        // Update group's last activity
        try {
          group.lastActivity = new Date();
          await group.save();
        } catch (saveError) {
          console.log(`   ⚠️  Could not update group activity: ${saveError.message}`);
        }

        // Send real-time notification via Socket.io
        try {
          const io = require('../app').io || global.io;
          if (io) {
            // Send the message to all group members via Socket.io
            io.to(`group:${group._id}`).emit('groupMessage', {
              _id: groupMessage._id,
              groupId: group._id,
              text: groupMessage.content.text,
              messageType: 'text',
              sender: {
                _id: user._id,
                name: userName
              },
              timestamp: groupMessage.createdAt,
              isOwn: false // For other members
            });

            // Also send SOS alert event
            io.to(`group:${group._id}`).emit('sosAlert', {
              alertId: sosAlert._id,
              userName,
              userPhone,
              location,
              deviceInfo,
              triggerTime: sosAlert.triggerTime,
              message: whatsappMessage,
              groupName: group.name,
              groupId: group._id
            });

            console.log(`   ✅ Real-time notification sent via Socket.io`);
          } else {
            console.log(`   ⚠️  Socket.io not available (message still saved in chat)`);
          }
        } catch (ioError) {
          console.log(`   ⚠️  Socket.io error: ${ioError.message} (message still saved in chat)`);
        }

        // Track in SOS alert (use 'pending' for in-app, not 'n/a')
        sosAlert.notificationsSent.push({
          recipientType: 'group',
          recipientId: group._id,
          recipientName: group.name,
          recipientPhone: 'in-app',
          smsStatus: 'pending', // Not applicable for in-app, but use valid enum
          whatsappStatus: 'pending', // Not applicable for in-app, but use valid enum
          sentAt: new Date()
        });

        groupsSuccess++;

      } catch (groupError) {
        console.log(`   ❌ Error sending to group: ${groupError.message}`);
        groupsFailed++;

        // Still track the failed attempt
        sosAlert.notificationsSent.push({
          recipientType: 'group',
          recipientId: group._id,
          recipientName: group.name,
          recipientPhone: 'in-app',
          smsStatus: 'failed', // Mark as failed
          whatsappStatus: 'failed', // Mark as failed
          error: groupError.message,
          sentAt: new Date()
        });
      }
    }

    console.log(`\n✅ Groups processed: ${userGroups.length} (in-app messages only)`);
    console.log(`   Success: ${groupsSuccess}, Failed: ${groupsFailed}\n`);

    // ═══════════════════════════════════════
    // FINAL: Update SOS Alert Status
    // ═══════════════════════════════════════
    sosAlert.status = 'sent';
    await sosAlert.save();

    // Calculate statistics
    const emergencyContactNotifications = sosAlert.notificationsSent.filter(n => n.recipientType === 'emergency_contact');
    const groupNotifications = sosAlert.notificationsSent.filter(n => n.recipientType === 'group');

    const smsSuccess = emergencyContactNotifications.filter(n => n.smsStatus === 'sent').length;
    const whatsappSuccess = emergencyContactNotifications.filter(n => n.whatsappStatus === 'sent').length;

    console.log('\n🚨 ═══════════════════════════════════════');
    console.log('🚨 SOS NOTIFICATION SUMMARY');
    console.log('🚨 ═══════════════════════════════════════');
    console.log(`📱 Emergency Contacts: ${emergencyContactNotifications.length}`);
    console.log(`   SMS Sent: ${smsSuccess}/${emergencyContactNotifications.length}`);
    console.log(`   WhatsApp Sent: ${whatsappSuccess}/${emergencyContactNotifications.length}`);
    console.log(`👥 Groups (In-App): ${groupNotifications.length}`);
    console.log(`✅ Total Notifications: ${sosAlert.notificationsSent.length}`);
    console.log('🚨 ═══════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ═══════════════════════════════════════');
    console.error('❌ ERROR IN SEND SOS NOTIFICATIONS');
    console.error('❌ ═══════════════════════════════════════');
    console.error(error);
    console.error('❌ ═══════════════════════════════════════\n');

    // Update status to failed
    try {
      const sosAlert = await SOSAlert.findById(alertId);
      if (sosAlert) {
        sosAlert.status = 'failed';
        await sosAlert.save();
      }
    } catch (saveError) {
      console.error('Failed to update SOS alert status:', saveError);
    }

    throw error;
  }
}

// Update location (for offline/online scenarios)
exports.updateLocation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { alertId, location, isOffline = false } = req.body;

    if (!alertId || !location || !location.latitude || !location.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Alert ID and location are required'
      });
    }

    const sosAlert = await SOSAlert.findOne({
      _id: alertId,
      userId
    });

    if (!sosAlert) {
      return res.status(404).json({
        success: false,
        message: 'SOS Alert not found'
      });
    }

    // Check if status actually changed and we haven't already notified
    const currentStatus = isOffline ? 'offline' : 'online';
    const lastNotifiedStatus = sosAlert.lastNotifiedStatus;

    // Only send notification if status changed from last notification
    let shouldNotify = false;
    let statusMessage = '';

    if (isOffline && lastNotifiedStatus !== 'offline') {
      // Device just went offline (and we haven't notified about offline yet)
      shouldNotify = true;
      const user = await User.findById(userId);
      const googleMapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      statusMessage = `⚠️ ${user.firstName} ${user.lastName}'s device went OFFLINE. Last known location: ${googleMapsLink}`;
      sosAlert.lastNotifiedStatus = 'offline';
    } else if (!isOffline && lastNotifiedStatus === 'offline') {
      // Device came back online after being offline (and we notified about offline)
      shouldNotify = true;
      const user = await User.findById(userId);
      const googleMapsLink = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      statusMessage = `✅ ${user.firstName} ${user.lastName}'s device is back ONLINE. Current location: ${googleMapsLink}`;
      sosAlert.lastNotifiedStatus = 'online';
    }

    // Add location update
    sosAlert.addLocationUpdate(
      location.latitude,
      location.longitude,
      location.address || '',
      isOffline
    );

    await sosAlert.save();

    // Send notification only if status changed
    if (shouldNotify && statusMessage) {
      const emergencyContacts = await EmergencyContact.find({
        userId,
        isActive: true
      });

      // Send update to emergency contacts (async, don't wait)
      for (const contact of emergencyContacts) {
        twilioService.sendSMS(contact.phoneNumber, statusMessage).catch(err =>
          console.error('Error sending location update SMS:', err)
        );
        twilioService.sendWhatsApp(contact.phoneNumber, statusMessage).catch(err =>
          console.error('Error sending location update WhatsApp:', err)
        );
      }

      console.log(`📍 Status change notification sent: ${isOffline ? 'OFFLINE' : 'ONLINE'}`);
    } else {
      console.log(`📍 Location updated (no notification needed)`);
    }

    return res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      notificationSent: shouldNotify
    });

  } catch (error) {
    console.error('Error updating location:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
};

// Get SOS history
exports.getSOSHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const sosAlerts = await SOSAlert.find(query)
      .sort({ triggerTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await SOSAlert.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: sosAlerts,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });

  } catch (error) {
    console.error('Error fetching SOS history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch SOS history',
      error: error.message
    });
  }
};

// Get SOS alert details
exports.getSOSDetails = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { alertId } = req.params;

    const sosAlert = await SOSAlert.findOne({
      _id: alertId,
      userId
    });

    if (!sosAlert) {
      return res.status(404).json({
        success: false,
        message: 'SOS Alert not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: sosAlert
    });

  } catch (error) {
    console.error('Error fetching SOS details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch SOS details',
      error: error.message
    });
  }
};

// Cancel SOS alert
exports.cancelSOS = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { alertId } = req.params;

    const sosAlert = await SOSAlert.findOne({
      _id: alertId,
      userId
    });

    if (!sosAlert) {
      return res.status(404).json({
        success: false,
        message: 'SOS Alert not found'
      });
    }

    if (sosAlert.status === 'cancelled' || sosAlert.status === 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'SOS Alert is already cancelled or resolved'
      });
    }

    sosAlert.status = 'cancelled';
    sosAlert.resolvedAt = new Date();
    sosAlert.resolvedBy = userId;
    await sosAlert.save();

    // Notify contacts about cancellation
    const user = await User.findById(userId);
    const emergencyContacts = await EmergencyContact.find({
      userId,
      isActive: true
    });

    const cancelMessage = `✅ SOS Alert CANCELLED\n\n${user.firstName} ${user.lastName} has cancelled the emergency alert. They are safe now.`;

    for (const contact of emergencyContacts) {
      twilioService.sendSMS(contact.phoneNumber, cancelMessage).catch(err =>
        console.error('Error sending cancellation SMS:', err)
      );
      twilioService.sendWhatsApp(contact.phoneNumber, cancelMessage).catch(err =>
        console.error('Error sending cancellation WhatsApp:', err)
      );
    }

    return res.status(200).json({
      success: true,
      message: 'SOS Alert cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling SOS:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel SOS alert',
      error: error.message
    });
  }
};

// Resolve SOS alert
exports.resolveSOS = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { alertId } = req.params;
    const { notes } = req.body;

    const sosAlert = await SOSAlert.findOne({
      _id: alertId,
      userId
    });

    if (!sosAlert) {
      return res.status(404).json({
        success: false,
        message: 'SOS Alert not found'
      });
    }

    sosAlert.status = 'resolved';
    sosAlert.resolvedAt = new Date();
    sosAlert.resolvedBy = userId;
    if (notes) {
      sosAlert.notes = notes;
    }
    await sosAlert.save();

    return res.status(200).json({
      success: true,
      message: 'SOS Alert resolved successfully'
    });

  } catch (error) {
    console.error('Error resolving SOS:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resolve SOS alert',
      error: error.message
    });
  }
};
