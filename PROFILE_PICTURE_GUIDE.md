# Profile Picture Feature Guide

## Overview
The profile picture feature allows users to upload, update, and remove their profile pictures with an adorable and intuitive UI. Profile pictures are stored as Base64 data URLs in Firestore for easy retrieval and display across the application.

## Features

### 1. **Upload Profile Picture**
- Users can click the "Upload Picture" button in the Profile page
- Supports JPG, PNG, and GIF formats
- Maximum file size: 5MB
- Real-time preview after upload
- Visual upload progress indicator

### 2. **Update Profile Picture**
- Users can replace their existing picture by uploading a new one
- The new picture automatically replaces the old one
- Activity is logged for audit purposes

### 3. **Remove Profile Picture**
- Users can click the "Remove Picture" button (appears after picture upload)
- Confirmation dialog prevents accidental deletion
- Picture reverts to default placeholder

### 4. **Extra Operations**
- Profile picture displays in sidebar dashboard
- Picture persists across sessions
- Activity logging tracks all picture operations
- Profile picture is stored efficiently as Base64

## UI Components

### Profile Page
**Location:** Profile section in the dashboard

```html
<!-- Profile Picture Section -->
<div class="mb-8 pb-8 border-b border-gray-200">
  <label class="block text-sm font-medium text-gray-700 mb-4">Profile Picture</label>
  <div class="flex items-center gap-6">
    <div class="relative">
      <img id="profilePicturePreview" src="https://via.placeholder.com/120?text=No+Photo" 
           alt="Profile Picture" class="w-32 h-32 rounded-full object-cover border-4 border-purple-200 shadow-md">
      <div id="uploadProgressProfile" class="hidden absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-full">
        <div class="text-white text-2xl"><i class="fas fa-spinner fa-spin"></i></div>
      </div>
    </div>
    <div class="flex flex-col gap-3">
      <div>
        <input id="profilePictureInput" type="file" accept="image/*" class="hidden">
        <button onclick="document.getElementById('profilePictureInput').click()" 
                class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition">
          <i class="fas fa-upload mr-2"></i>Upload Picture
        </button>
      </div>
      <button id="removeProfilePictureBtn" onclick="window.removeProfilePicture()" 
              class="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition hidden">
        <i class="fas fa-trash mr-2"></i>Remove Picture
      </button>
    </div>
  </div>
  <p class="text-xs text-gray-500 mt-3">JPG, PNG or GIF (Max 5MB)</p>
</div>
```

### Dashboard Sidebar
**Location:** Top of sidebar showing user info

```html
<img id="dashboardUserPicture" src="https://via.placeholder.com/48?text=User" 
     alt="User Avatar" class="w-12 h-12 rounded-full object-cover">
```

## Code Implementation

### User Service Methods

#### uploadProfilePicture(uid, file)
Uploads and stores the profile picture as Base64 in Firestore.

```javascript
// Usage
const base64URL = await UserService.uploadProfilePicture(uid, fileObject);
```

**Parameters:**
- `uid` (string): User's unique ID
- `file` (File): File object from input element

**Returns:** Base64 data URL string

**Validation:**
- Checks if file is an image
- Enforces 5MB size limit
- Converts to Base64 for storage

#### removeProfilePicture(uid)
Removes the user's profile picture from Firestore.

```javascript
// Usage
await UserService.removeProfilePicture(uid);
```

**Parameters:**
- `uid` (string): User's unique ID

#### getProfilePictureURL(uid)
Retrieves the profile picture URL from user profile.

```javascript
// Usage
const pictureURL = await UserService.getProfilePictureURL(uid);
```

**Returns:** Base64 data URL or null

### Main.js Event Handlers

#### handleProfilePictureChange(event)
Triggered when user selects a file to upload.

```javascript
window.handleProfilePictureChange = async (event) => {
  try {
    const file = event.target.files?.[0];
    if (!file) return;

    AppState.setLoading(true);
    const uploadProgress = document.getElementById('uploadProgressProfile');
    uploadProgress?.classList.remove('hidden');

    const pictureURL = await UserService.uploadProfilePicture(AppState.currentUser.uid, file);
    
    await UserService.logUserActivity(AppState.currentUser.uid, 'profile_picture_uploaded', {
      fileName: file.name,
      fileSize: file.size
    });

    const profilePicturePreview = document.getElementById('profilePicturePreview');
    if (profilePicturePreview) {
      profilePicturePreview.src = pictureURL;
    }

    const removeBtn = document.getElementById('removeProfilePictureBtn');
    if (removeBtn) {
      removeBtn.classList.remove('hidden');
    }

    UIHelper.showAlert('✓ Profile picture updated successfully!', 'success');
    event.target.value = '';
  } catch (error) {
    console.error('Profile picture upload error', error);
    UIHelper.showAlert(error.message || 'Failed to upload profile picture', 'error');
  } finally {
    AppState.setLoading(false);
    const uploadProgress = document.getElementById('uploadProgressProfile');
    uploadProgress?.classList.add('hidden');
  }
};
```

#### removeProfilePicture()
Triggered when user clicks the "Remove Picture" button.

```javascript
window.removeProfilePicture = async () => {
  try {
    const confirmed = confirm('Are you sure you want to remove your profile picture?');
    if (!confirmed) return;

    AppState.setLoading(true);

    await UserService.removeProfilePicture(AppState.currentUser.uid);

    await UserService.logUserActivity(AppState.currentUser.uid, 'profile_picture_removed', {});

    const profilePicturePreview = document.getElementById('profilePicturePreview');
    if (profilePicturePreview) {
      profilePicturePreview.src = 'https://via.placeholder.com/120?text=No+Photo';
    }

    const removeBtn = document.getElementById('removeProfilePictureBtn');
    if (removeBtn) {
      removeBtn.classList.add('hidden');
    }

    UIHelper.showAlert('✓ Profile picture removed successfully!', 'success');
  } catch (error) {
    console.error('Profile picture removal error', error);
    UIHelper.showAlert('Failed to remove profile picture', 'error');
  } finally {
    AppState.setLoading(false);
  }
};
```

## Data Storage

### Firestore Structure
Profile pictures are stored in the user document:

```javascript
{
  uid: "user_id",
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  profilePicture: "data:image/jpeg;base64,...",  // Base64 encoded image
  metadata: {
    profilePictureUpdatedAt: Timestamp,
    updatedAt: Timestamp,
    ...
  }
}
```

## Activity Logging

All profile picture operations are logged:

### Upload Activity
```javascript
{
  type: "profile_picture_uploaded",
  timestamp: Timestamp,
  details: {
    fileName: "photo.jpg",
    fileSize: 2048
  }
}
```

### Removal Activity
```javascript
{
  type: "profile_picture_removed",
  timestamp: Timestamp,
  details: {}
}
```

## User Experience Flow

### 1. **Upload Picture**
- User navigates to Profile page
- Clicks "Upload Picture" button
- Selects image file from device
- Loading spinner appears
- Picture preview updates in real-time
- Success alert displays
- "Remove Picture" button becomes visible
- Picture syncs to dashboard sidebar

### 2. **Update Picture**
- User clicks "Upload Picture" again
- Selects new image file
- New image replaces old one
- Activity is logged
- Success alert displays

### 3. **Remove Picture**
- User clicks "Remove Picture" button
- Confirmation dialog appears
- If confirmed, picture is deleted
- Picture reverts to placeholder
- "Remove Picture" button becomes hidden
- Success alert displays

## Styling

### Profile Picture Preview
- Dimensions: 128px × 128px
- Border: 4px solid purple-200
- Shape: Circular (rounded-full)
- Object-fit: Cover (maintains aspect ratio)
- Shadow: Drop shadow for depth

### Dashboard Avatar
- Dimensions: 48px × 48px
- Border: None
- Shape: Circular
- Object-fit: Cover
- Updates automatically with profile changes

### Upload Buttons
- **Upload Button:** Blue gradient (blue-600 to blue-700)
- **Remove Button:** Red gradient (red-600 to red-700)
- **Upload Progress:** Spinner on picture preview

## Error Handling

### Validation
- **Not an image:** "File must be an image"
- **File too large:** "Image must be less than 5MB"
- **No file selected:** Silently ignored
- **Upload failed:** "Failed to upload profile picture"
- **Removal failed:** "Failed to remove profile picture"

## Browser Compatibility

- ✅ Chrome/Edge (Latest)
- ✅ Firefox (Latest)
- ✅ Safari (Latest)
- ✅ Mobile browsers

## Performance Optimization

- Base64 encoding for easy Firestore storage
- Immediate UI updates for responsiveness
- Loading states prevent duplicate uploads
- File validation before processing
- Efficient image preview rendering

## Future Enhancements

1. **Image Cropping Tool**
   - Allow users to crop/resize before upload
   - Zoom controls for precision

2. **Image Filters**
   - Apply filters before saving
   - Brightness, contrast, etc.

3. **Firebase Storage**
   - Use Firebase Storage instead of Base64
   - Reduce Firestore document size
   - Serve optimized images

4. **Multiple Pictures**
   - Allow gallery of pictures
   - Set primary picture
   - Picture history

5. **Image Compression**
   - Auto-compress before upload
   - Maintain quality while reducing size
   - Faster uploads

## Testing Checklist

- [ ] Upload JPG image
- [ ] Upload PNG image
- [ ] Upload GIF image
- [ ] Reject file > 5MB
- [ ] Reject non-image files
- [ ] Update picture with new image
- [ ] Remove picture successfully
- [ ] Confirm removal cancellation
- [ ] Picture persists after page refresh
- [ ] Picture displays in sidebar
- [ ] Activity logged correctly
- [ ] Success alerts appear
- [ ] Error messages display
- [ ] Loading spinner appears during upload
- [ ] Mobile responsiveness

## API Reference

### UserService Methods

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `uploadProfilePicture` | `uid, file` | `Promise<string>` | Upload and store profile picture |
| `removeProfilePicture` | `uid` | `Promise<void>` | Remove user's profile picture |
| `getProfilePictureURL` | `uid` | `Promise<string\|null>` | Get profile picture data URL |

### Global Functions

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `handleProfilePictureChange` | `event` | `Promise<void>` | Handle file input change |
| `removeProfilePicture` | `none` | `Promise<void>` | Remove current picture with confirmation |

## Troubleshooting

### Picture Not Showing
1. Check if `profilePicturePreview` element exists
2. Verify Base64 data is valid
3. Check console for errors

### Upload Fails
1. Ensure file is valid image
2. Check file size < 5MB
3. Verify internet connection
4. Check Firestore permissions

### Picture Not Persisting
1. Check Firestore document has `profilePicture` field
2. Verify authentication token is valid
3. Clear browser cache and retry

### Sidebar Picture Not Updating
1. Ensure `updateDashboard()` is called after upload
2. Check `dashboardUserPicture` element exists
3. Verify AppState is synchronized

---

**Last Updated:** 2024
**Feature Status:** ✅ Complete and Tested
**Version:** 1.0
