package com.RentACarDemo.user;

import com.RentACarDemo.booking.BookingService;
import com.RentACarDemo.exceptions.ConflictException;
import com.RentACarDemo.exceptions.ResourceNotFoundException;
import com.RentACarDemo.user.dto.UpdateProfileRequestDto;
import com.RentACarDemo.user.dto.UserRequestDto;
import com.RentACarDemo.user.dto.UserResponseDto;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    public UserRepository userRepository;
    private final BookingService bookingService;

    public UserService(UserRepository userRepository, BookingService bookingService) {
        this.userRepository = userRepository;
        this.bookingService = bookingService;
    }

    @Transactional
    public UserResponseDto createUser(UserRequestDto userRequestDto) {

        User user = mapToUser(userRequestDto);

        userRepository.save(user);

        UserResponseDto userResp = mapToDto(user);

        return userResp;
    }

    /**
     * Legacy single-car booking endpoint. Delegates to the booking service so the
     * authoritative {@code bookings} table is always written.
     */
    @Transactional
    public void createBooking(Long uid, Long cid) {
        bookingService.createLegacyBooking(uid, cid);
    }

    /**
     * Legacy cancel endpoint. Cancels the caller's current reservation through
     * the booking service, which keeps the legacy mirrors in sync.
     */
    @Transactional
    public void cancelBooking(Long uid) {
        bookingService.cancelCurrentBooking(uid);
    }

    @Transactional
    public UserResponseDto getUser(Long id) {
        User user = userRepository
                .findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("User with id " + id + " does not exist"));

        // Keep the legacy bookedCar field truthful for the current day.
        bookingService.syncUserMirror(id);

        UserResponseDto userResp = mapToDto(user);
        return userResp;
    }

    @Transactional
    public List<UserResponseDto> getAllUser() {

        List<User> userList = userRepository.findByIsDeletedFalse();

        return userList.stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional
    public UserResponseDto updateProfile(UpdateProfileRequestDto userReq, Long id) {

        User user = userRepository
                .findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("User with id " + id + " does not exist"));

        String newEmail = userReq.getEmail().trim();

        if (userRepository.existsByEmailAndIdNot(newEmail, id)) {
            throw new ConflictException("Email already exists!");
        }

        user.setName(userReq.getName().trim());
        user.setEmail(newEmail);

        userRepository.save(user);

        return mapToDto(user);
    }

    /**
     * Legacy profile update kept for source compatibility. New code should use
     * {@link #updateProfile(UpdateProfileRequestDto, Long)}, which does not
     * require or ignore a password.
     */
    @Deprecated
    @Transactional
    public UserResponseDto updateCar(UserRequestDto userReq, Long id) {

        User user = userRepository
                .findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("User with id " + id + " does not exist"));

        User updatedUser = mapToUpdateUser(user, userReq);

        userRepository.save(user);

        UserResponseDto userResp = mapToDto(user);
        return userResp;
    }

    /**
     * Admin deletion is a soft delete so that booking history is preserved.
     * Active reservations are cancelled so the cars become available again.
     */
    @Transactional
    public void deleteUser(Long id) {
        softDelete(id);
    }

    @Transactional
    public void softDelete(Long id) {
        User user = userRepository
                .findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("User with id " + id + " does not exist"));

        bookingService.cancelAllForUser(id);

        user.setDeleted(true);
        user.setBookedCar(null);

        userRepository.save(user);
    }

    //DTO Mapping

    private User mapToUpdateUser(User user, UserRequestDto userReq) {

        user.setName(userReq.getName());
        user.setEmail(userReq.getEmail());

        return user;
    }

    private User mapToUser(UserRequestDto userRequestDto) {
        User user = new User();

        user.setName(userRequestDto.getName());
        user.setEmail(userRequestDto.getEmail());
        user.setPassword(userRequestDto.getPassword());
        user.setRole(Role.CUSTOMER);
        user.setDeleted(false);

        return user;
    }

    private UserResponseDto mapToDto(User user) {
        UserResponseDto userResp = new UserResponseDto();

        userResp.setId(user.getId());
        userResp.setName(user.getName());
        userResp.setEmail(user.getEmail());
        userResp.setBookedCar(user.getBookedCar());

        return userResp;
    }

}
