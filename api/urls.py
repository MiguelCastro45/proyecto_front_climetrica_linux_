from django.urls import path
from . import views

urlpatterns = [
   
    # Usuarios normales
    path('register/', views.register, name='register'),
    path('login/', views.login, name='login'),
    path('profile/', views.profile, name='profile'),

    # Admin — gestión de usuarios
    path('users/', views.list_users, name='list_users'),                # GET
    path('users/<str:user_id>/', views.update_user, name='update_user'), # PUT
    path('users/delete/<str:user_id>/', views.delete_user, name='delete_user'), # DELETE

    #Listar Datasets
    path('api/climate-data/', views.get_climate_data, name='get_climate_data'),
]
