<?php

namespace App\Http\Controllers;

use App\Entities\Restaurant;
use App\Repositories\RestaurantRepository;
use App\Repositories\UserRepository;
use App\Transformers\RestaurantTransformer;
use App\Transformers\RestaurantTransformerWithLogo;
use App\Transformers\UserTransformer;
use App\User;
use Dingo\Api\Routing\Helpers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Lang;

use App\Http\Requests;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Webpatser\Uuid\Uuid;

class UserController extends Controller
{
    use Helpers;
    protected $restaurantRepository;
    protected $restaurantOpenRepository;
    protected $userRepository;

    public function __construct(UserRepository $userRepository, RestaurantRepository $restaurantRepository, RestaurantOpenController $restaurantOpen)
    {
        $this->restaurantRepository = $restaurantRepository;
        $this->restaurantOpenRepository = $restaurantOpen;
        $this->userRepository = $userRepository;
    }

    public function store(Request $request)
    {
        app()->setLocale($request->input('lang', 'en'));
        if ($request->has("user") && !$this->userExists($request->user)){
            $user = $this->userRepository->store($request->user, "restaurant");
            $this->sendEmailReminder($user);
            return $this->response->item($user, new UserTransformer());
        } else {
            return ["user_exists" => "User already exists!"];
        }
    }

    public function all(){
        $user = $this->userRepository->all();
        $response = $this->response->collection($user, new UserTransformer());
        return $response;
    }

    public function getCurrentUser(){
        $user = app('Dingo\Api\Auth\Auth')->user();
        return $user;
    }

    public function detail($user_id){
        $user = $this->userRepository->detail($user_id);
        $response = $this->response->item($user, new UserTransformer());
        return $response;
    }

    public function getRestaurants($user_id){
        $restaurants = $this->userRepository->getRestaurants($user_id);
        $response = $this->response->collection($restaurants, new RestaurantTransformerWithLogo($this->restaurantRepository));
        return $response;
    }

    public function getCurrentRestaurant($user_id){
        $user = User::find($user_id);
        if ($user->restaurants){
            $restaurant =  $user->restaurants()->latest()->first();
            $response = $this->response->item($restaurant, new RestaurantTransformer());
            return $response;
        }
    }

    public function saveRestaurant(Request $request, $user_id){
        $restaurant = $this->restaurantRepository->save($request->restaurant, $user_id);
        $response = $this->response->item($restaurant, new RestaurantTransformer());
        return $response;

    }

    public function delete($user_id){
        $user = User::find($user_id);
        $user->delete();
        return $user;
    }

    public function userExists($user_input){
        if (User::where('email', $user_input["email"])->count()){
            return true;
        }
        return false;
    }

    public function userExistsRoute(Request $request){
        if (User::where('email', $request->email)->count()){
            return ["success" => "User exists!"];
        }
        return ["error" => "User doesn't Exist!"];
    }

    public function deleteRestaurants($user_id){
        $restaurant = $this->userRepository->deleteRestaurants($user_id);
        $response = $this->response->collection($restaurant, new RestaurantTransformer());
        return $response;

    }

    public function sendEmailReminder(User $user)
    {
        Mail::send('emails.reminder', ['user' => $user], function ($m) use($user){
        $m->from('cesko@gastro-booking.com', Lang::get("main.MAIL.GASTRO_BOOKING"));
        $m->to($user->email, $user->name)->subject(Lang::get("main.MAIL.REGISTRATION_SUCCESSFUL"));
    });

       return ['message' => "Email sent"];
    }

    public function update(Request $request, $userId)
    {
        $user = User::find($userId);
        $user->name = $request->name;
        $user->phone = $request->phone;

        if($request->email){
            $user->email = $request->email;
        }

        if($request->password){
            $user->password = bcrypt($request->password);
        }

        $user->save();

        $user->preregistration()->delete();

        $response = $this->response->item($user, new UserTransformer());
        return $response;
    }
}
